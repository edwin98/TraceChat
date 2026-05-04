from models import BranchMessage, BranchThread, MainContextMemory, MainMessage
from prompts import (
    BRANCH_SYSTEM_PROMPT,
    MAIN_SYSTEM_PROMPT,
    SUMMARY_PROMPT,
    TITLE_PROMPT,
)


def build_main_context(
    recent_messages: list[MainMessage],
    memories: list[MainContextMemory],
    branch_summaries: list[BranchThread],
    user_content: str,
) -> tuple[str, list[dict]]:
    system_parts = [MAIN_SYSTEM_PROMPT]

    for memory in memories:
        system_parts.append(f"[主线可用记忆] {memory.title}\n{memory.content}")

    for branch in branch_summaries:
        system_parts.append(
            f"[用户显式引用的支线摘要] {branch.title}\n{branch.summary}"
        )

    chat_messages = []
    for msg in recent_messages:
        chat_messages.append({"role": msg.role, "content": msg.content})

    chat_messages.append({"role": "user", "content": user_content})

    return "\n\n".join(system_parts), chat_messages


def build_branch_context(
    branch: BranchThread,
    branch_messages: list[BranchMessage],
) -> tuple[str, list[dict]]:
    snapshot = branch.source_snapshot
    system = (
        f"{BRANCH_SYSTEM_PROMPT}\n\n"
        f"来源主线消息：\n{snapshot.get('messageContent', '')}\n\n"
        f"选中文本：\n{branch.selected_text or '无'}\n\n"
        f"主线主题摘要：\n{snapshot.get('mainTopicSummary') or '无'}"
    )

    chat_messages = []
    for msg in branch_messages:
        chat_messages.append({"role": msg.role, "content": msg.content})

    return system, chat_messages


def build_summary_context(
    branch: BranchThread, branch_messages: list[BranchMessage]
) -> tuple[str, list[dict]]:
    conversation_text = "\n".join(
        f"{'用户' if m.role == 'user' else 'AI'}：{m.content}" for m in branch_messages
    )
    user_content = f"支线标题：{branch.title}\n\n支线对话：\n{conversation_text}"
    return SUMMARY_PROMPT, [{"role": "user", "content": user_content}]


def build_title_context(initial_question: str) -> tuple[str, list[dict]]:
    return TITLE_PROMPT, [{"role": "user", "content": f"用户问题：{initial_question}"}]
