import asyncio
import json

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/api/streams", tags=["streams"])

_stream_store: dict[str, asyncio.Queue] = {}


@router.get("/{stream_id}")
async def stream_response(stream_id: str):
    queue = _stream_store.get(stream_id)
    if queue is None:
        return StreamingResponse(
            iter(['data: {"error": "stream not found"}\n\n']),
            media_type="text/event-stream",
        )

    async def event_generator():
        try:
            while True:
                try:
                    event_type, payload = await asyncio.wait_for(
                        queue.get(), timeout=60.0
                    )
                except asyncio.TimeoutError:
                    yield 'data: {"error": "timeout"}\n\n'
                    break

                if event_type == "data":
                    yield f"data: {json.dumps({'type': 'chunk', 'content': payload})}\n\n"
                elif event_type == "done":
                    yield f"data: {json.dumps({'type': 'done', 'messageId': payload})}\n\n"
                    break
                elif event_type == "error":
                    yield f"data: {json.dumps({'type': 'error', 'message': payload})}\n\n"
                    break
        finally:
            _stream_store.pop(stream_id, None)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
