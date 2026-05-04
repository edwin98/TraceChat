from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ConversationCreate(BaseModel):
    title: str = "新对话"


class ConversationUpdate(BaseModel):
    title: str


class ConversationOut(BaseModel):
    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    branch_count: int = 0

    model_config = {"from_attributes": True}


class MainMessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    message_index: int
    metadata_: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateMainMessageInput(BaseModel):
    content: str
    referenced_branch_ids: list[str] = []


class CreateMainMessageResponse(BaseModel):
    user_message_id: str
    assistant_message_id: str
    stream_url: str


class SelectionRange(BaseModel):
    start_offset: int
    end_offset: int


class CreateBranchInput(BaseModel):
    conversation_id: str
    source_message_id: str
    selected_text: Optional[str] = None
    selection_range: Optional[SelectionRange] = None
    initial_question: str
    intent: str = "explain"


class CreateBranchResponse(BaseModel):
    branch_thread_id: str
    assistant_message_id: str
    stream_url: str


class BranchThreadOut(BaseModel):
    id: str
    conversation_id: str
    source_message_id: str
    source_message_index: int
    selected_text: Optional[str] = None
    selection_range: Optional[dict] = None
    source_snapshot: dict
    title: str
    status: str
    summary: Optional[str] = None
    summary_updated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BranchMessageOut(BaseModel):
    id: str
    branch_thread_id: str
    role: str
    content: str
    metadata_: Optional[dict] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class CreateBranchMessageInput(BaseModel):
    content: str


class CreateBranchMessageResponse(BaseModel):
    user_message_id: str
    assistant_message_id: str
    stream_url: str


class SummarizeBranchInput(BaseModel):
    max_length: int = 200
    style: str = "main_context"


class SummarizeBranchResponse(BaseModel):
    summary: str


class MergeBranchInput(BaseModel):
    summary: str
    mode: str = "memory"


class MergeBranchResponse(BaseModel):
    memory_id: str
    branch_status: str


class MainContextMemoryOut(BaseModel):
    id: str
    conversation_id: str
    source_type: str
    source_id: Optional[str] = None
    title: str
    content: str
    enabled: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class BranchListItem(BaseModel):
    id: str
    title: str
    status: str
    summary: Optional[str] = None

    model_config = {"from_attributes": True}


class UpdateBranchStatusInput(BaseModel):
    status: str


class BulkUpdateBranchStatusInput(BaseModel):
    branch_ids: list[str]
    status: str


class BulkBranchStatusItem(BaseModel):
    id: str
    status: str


class BulkUpdateBranchStatusResponse(BaseModel):
    updated: int
    branches: list[BulkBranchStatusItem]
