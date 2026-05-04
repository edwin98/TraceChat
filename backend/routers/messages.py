from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models import BranchThread

router = APIRouter(prefix="/api/main-messages", tags=["messages"])


@router.get("/{message_id}/branches")
async def get_message_branches(message_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(BranchThread)
        .where(BranchThread.source_message_id == message_id)
        .order_by(BranchThread.created_at)
    )
    branches = result.scalars().all()
    return {
        "branches": [
            {
                "id": b.id,
                "title": b.title,
                "status": b.status,
                "summary": b.summary,
                "selected_text": b.selected_text,
            }
            for b in branches
        ]
    }
