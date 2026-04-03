from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TOPUP with python"
    app_tagline: str = "Let's go pro"
    database_url: str = "sqlite:///./topup_with_python.db"
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    public_app_url: str | None = None
    opay_env: str = "demo"
    opay_base_url: str = "https://testapi.opaycheckout.com/api/v1/international"
    opay_merchant_id: str | None = None
    opay_public_key: str | None = None
    opay_private_key: str | None = None
    opay_country: str = "NG"
    opay_currency: str = "NGN"
    premium_price_minor: int = Field(default=90_000, ge=100)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def opay_enabled(self) -> bool:
        return all(
            [
                self.opay_env.lower() != "demo",
                self.opay_merchant_id,
                self.opay_public_key,
                self.opay_private_key,
            ]
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
