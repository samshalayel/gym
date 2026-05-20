from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./gym.db"
    SECRET_KEY: str = "gym-management-secret-key-2024"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    TIMEZONE: str = "Asia/Hebron"

    class Config:
        env_file = ".env"


settings = Settings()
