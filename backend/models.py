import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.sqlite import JSON

from database import Base


def new_uuid() -> str:
    return str(uuid.uuid4())


def now() -> datetime:
    return datetime.utcnow()


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    main_messages: Mapped[list["MainMessage"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    branch_threads: Mapped[list["BranchThread"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    context_memories: Mapped[list["MainContextMemory"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


class MainMessage(Base):
    __tablename__ = "main_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("conversations.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    message_index: Mapped[int] = mapped_column(Integer, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    conversation: Mapped["Conversation"] = relationship(back_populates="main_messages")
    branch_threads: Mapped[list["BranchThread"]] = relationship(
        back_populates="source_message"
    )


class BranchThread(Base):
    __tablename__ = "branch_threads"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("conversations.id"), nullable=False
    )
    source_message_id: Mapped[str] = mapped_column(
        String, ForeignKey("main_messages.id"), nullable=False
    )
    source_message_index: Mapped[int] = mapped_column(Integer, nullable=False)
    selected_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    selection_range: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    source_snapshot: Mapped[dict] = mapped_column(JSON, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    summary_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    conversation: Mapped["Conversation"] = relationship(back_populates="branch_threads")
    source_message: Mapped["MainMessage"] = relationship(
        back_populates="branch_threads"
    )
    messages: Mapped[list["BranchMessage"]] = relationship(
        back_populates="branch_thread", cascade="all, delete-orphan"
    )


class BranchMessage(Base):
    __tablename__ = "branch_messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    branch_thread_id: Mapped[str] = mapped_column(
        String, ForeignKey("branch_threads.id"), nullable=False
    )
    role: Mapped[str] = mapped_column(String, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)

    branch_thread: Mapped["BranchThread"] = relationship(back_populates="messages")


class MainContextMemory(Base):
    __tablename__ = "main_context_memories"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=new_uuid)
    conversation_id: Mapped[str] = mapped_column(
        String, ForeignKey("conversations.id"), nullable=False
    )
    source_type: Mapped[str] = mapped_column(String, nullable=False)
    source_id: Mapped[str | None] = mapped_column(String, nullable=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=now, onupdate=now)

    conversation: Mapped["Conversation"] = relationship(
        back_populates="context_memories"
    )
