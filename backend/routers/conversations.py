import asyncio
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from context_builder import build_main_context
from database import AsyncSessionLocal, get_db
from llm import stream_completion
from models import BranchThread, Conversation, MainContextMemory, MainMessage
from schemas import (
    ConversationCreate,
    ConversationOut,
    CreateMainMessageInput,
    CreateMainMessageResponse,
    MainMessageOut,
)
from config import settings

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


@router.post("", response_model=ConversationOut)
async def create_conversation(
    body: ConversationCreate, db: AsyncSession = Depends(get_db)
):
    conv = Conversation(title=body.title)
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.get("", response_model=list[ConversationOut])
async def list_conversations(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation).order_by(Conversation.updated_at.desc())
    )
    return result.scalars().all()


@router.get("/{conversation_id}", response_model=ConversationOut)
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(404, "conversation not found")
    return conv


@router.get("/{conversation_id}/messages", response_model=list[MainMessageOut])
async def get_messages(conversation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MainMessage)
        .where(MainMessage.conversation_id == conversation_id)
        .order_by(MainMessage.message_index)
    )
    return result.scalars().all()


@router.post("/{conversation_id}/messages", response_model=CreateMainMessageResponse)
async def create_main_message(
    conversation_id: str,
    body: CreateMainMessageInput,
    db: AsyncSession = Depends(get_db),
):
    conv = await db.get(Conversation, conversation_id)
    if not conv:
        raise HTTPException(404, "conversation not found")

    result = await db.execute(
        select(MainMessage)
        .where(MainMessage.conversation_id == conversation_id)
        .order_by(MainMessage.message_index.desc())
        .limit(1)
    )
    last = result.scalar_one_or_none()
    next_index = (last.message_index + 1) if last else 0

    user_msg = MainMessage(
        conversation_id=conversation_id,
        role="user",
        content=body.content,
        message_index=next_index,
    )
    db.add(user_msg)
    await db.commit()
    await db.refresh(user_msg)

    result = await db.execute(
        select(MainMessage)
        .where(MainMessage.conversation_id == conversation_id)
        .order_by(MainMessage.message_index)
        .limit(20)
    )
    recent_messages = [m for m in result.scalars().all() if m.id != user_msg.id]

    result = await db.execute(
        select(MainContextMemory).where(
            MainContextMemory.conversation_id == conversation_id,
            MainContextMemory.enabled,
        )
    )
    memories = list(result.scalars().all())

    branch_summaries: list[BranchThread] = []
    if body.referenced_branch_ids:
        result = await db.execute(
            select(BranchThread).where(BranchThread.id.in_(body.referenced_branch_ids))
        )
        branch_summaries = list(result.scalars().all())

    from routers.streams import _stream_store

    assistant_id = str(uuid.uuid4())
    stream_id = str(uuid.uuid4())
    queue: asyncio.Queue = asyncio.Queue()
    _stream_store[stream_id] = queue

    system, chat_messages = build_main_context(
        recent_messages=recent_messages,
        memories=memories,
        branch_summaries=branch_summaries,
        user_content=body.content,
    )

    async def _run():
        full_content = ""
        try:
            async for chunk in stream_completion(
                system, chat_messages, settings.main_model
            ):
                full_content += chunk
                await queue.put(("data", chunk))
        except Exception as e:
            await queue.put(("error", str(e)))
            return
        async with AsyncSessionLocal() as s:
            asst_msg = MainMessage(
                id=assistant_id,
                conversation_id=conversation_id,
                role="assistant",
                content=full_content,
                message_index=next_index + 1,
            )
            s.add(asst_msg)
            conv_obj = await s.get(Conversation, conversation_id)
            if conv_obj:
                conv_obj.updated_at = datetime.utcnow()
            await s.commit()
        await queue.put(("done", assistant_id))

    asyncio.create_task(_run())

    return CreateMainMessageResponse(
        user_message_id=user_msg.id,
        assistant_message_id=assistant_id,
        stream_url=f"/api/streams/{stream_id}",
    )


@router.get("/{conversation_id}/branches")
async def list_conversation_branches(
    conversation_id: str,
    status: str | None = None,
    source_message_id: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(BranchThread).where(BranchThread.conversation_id == conversation_id)
    if status:
        query = query.where(BranchThread.status == status)
    if source_message_id:
        query = query.where(BranchThread.source_message_id == source_message_id)
    result = await db.execute(query.order_by(BranchThread.updated_at.desc()))
    branches = result.scalars().all()
    return {
        "branches": [
            {
                "id": b.id,
                "title": b.title,
                "status": b.status,
                "summary": b.summary,
                "source_message_id": b.source_message_id,
                "selected_text": b.selected_text,
                "created_at": b.created_at.isoformat(),
                "updated_at": b.updated_at.isoformat(),
            }
            for b in branches
        ]
    }
