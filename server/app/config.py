from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application configuration, loaded from environment / .env."""

    database_url: str = "sqlite:///./database.sqlite"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_ttl_minutes: int = 10080  # 7 days

    bcrypt_rounds: int = 12

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
