from typing import AsyncGenerator

import anthropic

from config import settings

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


async def stream_completion(
    system: str,
    messages: list[dict],
    model: str,
) -> AsyncGenerator[str, None]:
    async with client.messages.stream(
        model=model,
        max_tokens=4096,
        system=system or None,
        messages=messages,
    ) as stream:
        async for text in stream.text_stream:
            yield text


async def complete(system: str, messages: list[dict], model: str) -> str:
    response = await client.messages.create(
        model=model,
        max_tokens=1024,
        system=system or None,
        messages=messages,
    )
    return response.content[0].text
