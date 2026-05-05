import os
from pathlib import Path

from dotenv import set_key
from fastapi import APIRouter
from pydantic import BaseModel

from config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])

ENV_PATH = Path(__file__).parent.parent / ".env"

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

_ENV_KEY_MAP = {
    "anthropic": "ANTHROPIC_API_KEY",
    "openai": "OPENAI_API_KEY",
    "gemini": "GEMINI_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
}


def get_active_providers() -> list[str]:
    active = []
    if os.environ.get("ANTHROPIC_API_KEY"):
        active.append("Anthropic")
    if os.environ.get("OPENAI_API_KEY"):
        active.append("OpenAI")
    if os.environ.get("GEMINI_API_KEY"):
        active.append("Google")
    if os.environ.get("OPENROUTER_API_KEY"):
        active.append("OpenRouter")
    active.append("Ollama")  # always available if Ollama is running locally
    return active


class ModelUpdate(BaseModel):
    main_model: str | None = None
    branch_model: str | None = None


class ApiKeyUpdate(BaseModel):
    anthropic: str | None = None
    openai: str | None = None
    gemini: str | None = None
    openrouter: str | None = None


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


@router.get("/api-keys")
async def get_api_key_status():
    return {
        provider: bool(os.environ.get(env_var))
        for provider, env_var in _ENV_KEY_MAP.items()
    }


@router.put("/api-keys")
async def update_api_keys(body: ApiKeyUpdate):
    updates = {
        "anthropic": body.anthropic,
        "openai": body.openai,
        "gemini": body.gemini,
        "openrouter": body.openrouter,
    }
    for provider, value in updates.items():
        if value is None:
            continue
        env_var = _ENV_KEY_MAP[provider]
        if value:
            os.environ[env_var] = value
        else:
            os.environ.pop(env_var, None)
        # Persist to .env if it exists
        if ENV_PATH.exists():
            set_key(str(ENV_PATH), env_var, value)

    return {
        "active_providers": get_active_providers(),
        "status": {
            provider: bool(os.environ.get(env_var))
            for provider, env_var in _ENV_KEY_MAP.items()
        },
    }


def get_main_model() -> str:
    return _current["main_model"]


def get_branch_model() -> str:
    return _current["branch_model"]
