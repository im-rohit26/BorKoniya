from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "BorKonya"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    ALLOWED_ORIGINS: Union[str, List[str]] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    def parse_allowed_origins(cls, v):
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    # Database
    DATABASE_URL: str = "sqlite:///./borkonya.db"

    # Supabase (Optional in dev, required in production)
    SUPABASE_URL: str = "https://mock.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "mock-service-key"
    SUPABASE_ANON_KEY: str = "mock-anon-key"

    # JWT
    JWT_SECRET: str = "super_secret_jwt_signing_key_borkonya_community_2026_dev"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # OTP
    OTP_PROVIDER_KEY: str = "mock_otp_provider_key"
    SMS_SENDER_ID: str = "BORKON"

    # Payment
    PAYMENT_PROVIDER: str = "MOCK"
    PAYMENT_PROVIDER_KEY: str = "mock_payment_key"
    PAYMENT_PROVIDER_SECRET: str = "mock_payment_secret"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
