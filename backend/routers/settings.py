from fastapi import APIRouter
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])

# Runtime-mutable model selections (in-memory, resets on restart; use .env for persistence)
_current = {
    "main_model": settings.main_model,
    "branch_model": settings.branch_model,
}

PRESET_MODELS = [
    # Anthropic
    {"id": "claude-opus-4-7", "name": "Claude Opus 4.7", "provider": "Anthropic"},
    {"id": "claude-sonnet-4-6", "name": "Claude Sonnet 4.6", "provider": "Anthropic"},
    {
        "id": "claude-haiku-4-5-20251001",
        "name": "Claude Haiku 4.5",
        "provider": "Anthropic",
    },
    # OpenAI
    {"id": "gpt-4o", "name": "GPT-4o", "provider": "OpenAI"},
    {"id": "gpt-4o-mini", "name": "GPT-4o Mini", "provider": "OpenAI"},
    {"id": "o3-mini", "name": "o3-mini", "provider": "OpenAI"},
    # Google Gemini
    {"id": "gemini/gemini-2.0-flash", "name": "Gemini 2.0 Flash", "provider": "Google"},
    {"id": "gemini/gemini-2.5-pro", "name": "Gemini 2.5 Pro", "provider": "Google"},
    # OpenRouter (gateway to many providers)
    {
        "id": "openrouter/deepseek/deepseek-r1",
        "name": "DeepSeek R1 (OpenRouter)",
        "provider": "OpenRouter",
    },
    # Local (Ollama)
    {"id": "ollama/llama3", "name": "Llama 3 (Ollama local)", "provider": "Ollama"},
    {"id": "ollama/qwen2.5", "name": "Qwen 2.5 (Ollama local)", "provider": "Ollama"},
]


def get_active_providers() -> list[str]:
    active = []
    if settings.anthropic_api_key:
        active.append("Anthropic")
    if settings.openai_api_key:
        active.append("OpenAI")
    if settings.gemini_api_key:
        active.append("Google")
    if settings.openrouter_api_key:
        active.append("OpenRouter")
    active.append("Ollama")  # always available if Ollama is running locally
    return active


class ModelUpdate(BaseModel):
    main_model: str | None = None
    branch_model: str | None = None


@router.get("")
async def get_settings():
    return {
        "main_model": _current["main_model"],
        "branch_model": _current["branch_model"],
        "available_models": PRESET_MODELS,
        "active_providers": get_active_providers(),
    }


@router.put("")
async def update_settings(body: ModelUpdate):
    if body.main_model is not None:
        _current["main_model"] = body.main_model
    if body.branch_model is not None:
        _current["branch_model"] = body.branch_model
    return _current


def get_main_model() -> str:
    return _current["main_model"]


def get_branch_model() -> str:
    return _current["branch_model"]
