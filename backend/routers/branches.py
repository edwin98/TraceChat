import asyncio
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from context_builder import (
    build_branch_context,
    build_summary_context,
    build_title_context,
)
from database import AsyncSessionLocal, get_db
from llm import complete, stream_completion
from models import (
    BranchMessage,
    BranchThread,
    Conversation,
    MainContextMemory,
    MainMessage,
)
from schemas import (
    BranchMessageOut,
    BranchThreadOut,
    CreateBranchInput,
    CreateBranchMessageInput,
    CreateBranchMessageResponse,
    CreateBranchResponse,
    MergeBranchInput,
    MergeBranchResponse,
    SummarizeBranchInput,
    SummarizeBranchResponse,
    UpdateBranchStatusInput,
)
from routers.settings import get_branch_model

router = APIRouter(prefix="/api/branches", tags=["branches"])

_stream_store: dict[str, asyncio.Queue] = {}


def _get_stream_store():
    from routers.streams import _stream_store as ss

    return ss


@router.post("", response_model=CreateBranchResponse)
async def create_branch(body: CreateBranchInput, db: AsyncSession = Depends(get_db)):
    source_msg = await db.get(MainMessage, body.source_message_id)
    if not source_msg:
        raise HTTPException(404, "source message not found")

    conv = await db.get(Conversation, body.conversation_id)
    conv_title = conv.title if conv else ""

    result = await db.execute(
        select(MainMessage)
        .where(MainMessage.conversation_id == body.conversation_id)
        .order_by(MainMessage.message_index.desc())
        .limit(3)
    )
    recent = list(result.scalars().all())
    main_topic_summary = recent[0].content[:200] if recent else ""

    title_system, title_msgs = build_title_context(body.initial_question)
    title = await complete(title_system, title_msgs, get_branch_model())
    title = title.strip().strip('"').strip()[:50] or body.initial_question[:30]

    branch = BranchThread(
        conversation_id=body.conversation_id,
        source_message_id=body.source_message_id,
        source_message_index=source_msg.message_index,
        selected_text=body.selected_text,
        selection_range=(
            body.selection_range.model_dump() if body.selection_range else None
        ),
        source_snapshot={
            "messageContent": source_msg.content,
            "conversationTitle": conv_title,
            "mainTopicSummary": main_topic_summary,
        },
        title=title,
        status="active",
    )
    db.add(branch)
    await db.commit()
    await db.refresh(branch)

    user_bm = BranchMessage(
        branch_thread_id=branch.id,
        role="user",
        content=body.initial_question,
    )
    db.add(user_bm)
    await db.commit()
    await db.refresh(user_bm)

    assistant_id = str(uuid.uuid4())
    stream_id = str(uuid.uuid4())

    from routers.streams import _stream_store

    queue: asyncio.Queue = asyncio.Queue()
    _stream_store[stream_id] = queue

    branch_system, branch_msgs = build_branch_context(branch, [user_bm])

    branch_id = branch.id

    async def _run():
        full_content = ""
        try:
            async for chunk in stream_completion(
                branch_system, branch_msgs, get_branch_model()
            ):
                full_content += chunk
                await queue.put(("data", chunk))
        except Exception as e:
            await queue.put(("error", str(e)))
            return
        async with AsyncSessionLocal() as s:
            asst_bm = BranchMessage(
                id=assistant_id,
                branch_thread_id=branch_id,
                role="assistant",
                content=full_content,
            )
            s.add(asst_bm)
            b = await s.get(BranchThread, branch_id)
            if b:
                b.updated_at = datetime.utcnow()
            await s.commit()
        await queue.put(("done", assistant_id))

    asyncio.create_task(_run())

    return CreateBranchResponse(
        branch_thread_id=branch.id,
        assistant_message_id=assistant_id,
        stream_url=f"/api/streams/{stream_id}",
    )


@router.get("/{branch_id}", response_model=BranchThreadOut)
async def get_branch(branch_id: str, db: AsyncSession = Depends(get_db)):
    branch = await db.get(BranchThread, branch_id)
    if not branch:
        raise HTTPException(404, "branch not found")
    return branch


@router.get("/{branch_id}/messages", response_model=list[BranchMessageOut])
async def get_branch_messages(branch_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BranchMessage)
        .where(BranchMessage.branch_thread_id == branch_id)
        .order_by(BranchMessage.created_at)
    )
    return result.scalars().all()


@router.post("/{branch_id}/messages", response_model=CreateBranchMessageResponse)
async def create_branch_message(
    branch_id: str,
    body: CreateBranchMessageInput,
    db: AsyncSession = Depends(get_db),
):
    branch = await db.get(BranchThread, branch_id)
    if not branch:
        raise HTTPException(404, "branch not found")

    user_bm = BranchMessage(
        branch_thread_id=branch_id,
        role="user",
        content=body.content,
    )
    db.add(user_bm)
    await db.commit()
    await db.refresh(user_bm)

    result = await db.execute(
        select(BranchMessage)
        .where(BranchMessage.branch_thread_id == branch_id)
        .order_by(BranchMessage.created_at)
    )
    all_messages = list(result.scalars().all())

    assistant_id = str(uuid.uuid4())
    stream_id = str(uuid.uuid4())

    from routers.streams import _stream_store

    queue: asyncio.Queue = asyncio.Queue()
    _stream_store[stream_id] = queue

    branch_system2, branch_msgs2 = build_branch_context(branch, all_messages)

    async def _run():
        full_content = ""
        try:
            async for chunk in stream_completion(
                branch_system2, branch_msgs2, get_branch_model()
            ):
                full_content += chunk
                await queue.put(("data", chunk))
        except Exception as e:
            await queue.put(("error", str(e)))
            return
        async with AsyncSessionLocal() as s:
            asst_bm = BranchMessage(
                id=assistant_id,
                branch_thread_id=branch_id,
                role="assistant",
                content=full_content,
            )
            s.add(asst_bm)
            b = await s.get(BranchThread, branch_id)
            if b:
                b.updated_at = datetime.utcnow()
                b.summary_updated_at = None  # invalidate summary after new messages
            await s.commit()
        await queue.put(("done", assistant_id))

    asyncio.create_task(_run())

    return CreateBranchMessageResponse(
        user_message_id=user_bm.id,
        assistant_message_id=assistant_id,
        stream_url=f"/api/streams/{stream_id}",
    )


@router.post("/{branch_id}/summary", response_model=SummarizeBranchResponse)
async def summarize_branch(
    branch_id: str,
    body: SummarizeBranchInput,
    db: AsyncSession = Depends(get_db),
):
    branch = await db.get(BranchThread, branch_id)
    if not branch:
        raise HTTPException(404, "branch not found")

    result = await db.execute(
        select(BranchMessage)
        .where(BranchMessage.branch_thread_id == branch_id)
        .order_by(BranchMessage.created_at)
    )
    messages = list(result.scalars().all())

    summary_system, summary_msgs = build_summary_context(branch, messages)
    summary = await complete(summary_system, summary_msgs, get_branch_model())
    summary = summary.strip()

    branch.summary = summary
    branch.summary_updated_at = datetime.utcnow()
    await db.commit()

    return SummarizeBranchResponse(summary=summary)


@router.post("/{branch_id}/merge", response_model=MergeBranchResponse)
async def merge_branch(
    branch_id: str,
    body: MergeBranchInput,
    db: AsyncSession = Depends(get_db),
):
    branch = await db.get(BranchThread, branch_id)
    if not branch:
        raise HTTPException(404, "branch not found")

    memory = MainContextMemory(
        conversation_id=branch.conversation_id,
        source_type="branch_summary",
        source_id=branch.id,
        title=branch.title,
        content=body.summary,
        enabled=True,
    )
    db.add(memory)

    branch.status = "merged"
    branch.summary = body.summary
    branch.summary_updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(memory)

    return MergeBranchResponse(memory_id=memory.id, branch_status="merged")


@router.patch("/{branch_id}/status")
async def update_branch_status(
    branch_id: str,
    body: UpdateBranchStatusInput,
    db: AsyncSession = Depends(get_db),
):
    branch = await db.get(BranchThread, branch_id)
    if not branch:
        raise HTTPException(404, "branch not found")
    valid_statuses = {"active", "collapsed", "saved", "merged", "archived"}
    if body.status not in valid_statuses:
        raise HTTPException(400, "invalid status")
    branch.status = body.status
    branch.updated_at = datetime.utcnow()
    await db.commit()
    return {"id": branch.id, "status": branch.status}
