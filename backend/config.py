from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./tracechat.db"

    # Provider API keys — all optional, set whichever you use
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None  # Google Gemini
    openrouter_api_key: Optional[str] = None  # OpenRouter (multi-provider gateway)

    # Default models — use LiteLLM model string format:
    #   Anthropic:   claude-sonnet-4-6
    #   OpenAI:      gpt-4o  /  gpt-4o-mini
    #   Gemini:      gemini/gemini-2.0-flash
    #   Ollama:      ollama/llama3  (local, no key needed)
    #   OpenRouter:  openrouter/anthropic/claude-3.5-sonnet
    main_model: str = "claude-sonnet-4-6"
    branch_model: str = "claude-haiku-4-5-20251001"

    class Config:
        env_file = ".env"


settings = Settings()
