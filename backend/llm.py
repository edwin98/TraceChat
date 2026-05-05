import os
from typing import AsyncGenerator

import litellm

from config import settings

# Inject provider keys into env so LiteLLM can pick them up automatically
_key_map = {
    "ANTHROPIC_API_KEY": settings.anthropic_api_key,
    "OPENAI_API_KEY": settings.openai_api_key,
    "GEMINI_API_KEY": settings.gemini_api_key,
    "OPENROUTER_API_KEY": settings.openrouter_api_key,
    "DEEPSEEK_API_KEY": settings.deepseek_api_key,
    "DASHSCOPE_API_KEY": settings.dashscope_api_key,
}
for env_var, value in _key_map.items():
    if value:
        os.environ.setdefault(env_var, value)

litellm.drop_params = True  # silently drop unsupported params per provider


def _build_messages(system: str, messages: list[dict]) -> list[dict]:
    """Prepend system prompt as a system message (works for all providers)."""
    result = []
    if system:
        result.append({"role": "system", "content": system})
    result.extend(messages)
    return result


async def stream_completion(
    system: str,
    messages: list[dict],
    model: str,
) -> AsyncGenerator[str, None]:
    full_messages = _build_messages(system, messages)
    response = await litellm.acompletion(
        model=model,
        messages=full_messages,
        max_tokens=4096,
        stream=True,
    )
    async for chunk in response:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


async def complete(system: str, messages: list[dict], model: str) -> str:
    full_messages = _build_messages(system, messages)
    response = await litellm.acompletion(
        model=model,
        messages=full_messages,
        max_tokens=1024,
        stream=False,
    )
    return response.choices[0].message.content or ""
