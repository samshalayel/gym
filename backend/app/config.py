import os
import sys
from pydantic_settings import BaseSettings


def _default_database_url() -> str:
    """When packaged as a desktop .exe, keep gym.db in a writable data/ folder
    next to the executable. Otherwise (server / dev) use the local ./gym.db."""
    if getattr(sys, "frozen", False):
        base = os.path.dirname(sys.executable)
        data_dir = os.path.join(base, "data")
        os.makedirs(data_dir, exist_ok=True)
        # SQLite URLs require forward slashes even on Windows.
        db_path = os.path.join(data_dir, "gym.db").replace("\\", "/")
        return f"sqlite:///{db_path}"
    return "sqlite:///./gym.db"


class Settings(BaseSettings):
    DATABASE_URL: str = _default_database_url()
    SECRET_KEY: str = "gym-management-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    TIMEZONE: str = "Asia/Hebron"

    class Config:
        env_file = ".env"


if getattr(sys, "frozen", False):
    # Packaged desktop build: ignore any stray .env / env vars and pin the DB
    # next to the executable. Explicit init args outrank env sources in pydantic.
    settings = Settings(DATABASE_URL=_default_database_url())
else:
    settings = Settings()
