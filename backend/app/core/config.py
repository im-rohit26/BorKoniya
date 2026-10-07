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
            origins = set()
            for i in v.split(","):
                stripped = i.strip()
                if stripped:
                    origins.add(stripped)
                    origins.add(stripped.rstrip("/"))
            return list(origins)
        return v

    # Database
    DATABASE_URL: str

    @field_validator("DATABASE_URL", mode="before")
    def fix_database_url(cls, v):
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    # Supabase (Optional in dev, required in production)
    SUPABASE_URL: str = "https://mock.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "mock-service-key"
    SUPABASE_ANON_KEY: str = "mock-anon-key"

    # JWT
    JWT_SECRET: str = "super_secret_jwt_signing_key_borkonya_community_2026_dev"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # OTP / Email SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_NAME: str = "BorKonya"
    OTP_EXPIRY_MINUTES: int = 10
    OTP_RESEND_COOLDOWN_SECONDS: int = 60
    OTP_PROVIDER_KEY: str = "mock_otp_provider_key"
    SMS_SENDER_ID: str = "BORKON"
    BACKEND_PUBLIC_URL: str = ""

    @field_validator("SMTP_USER", mode="before")
    def clean_smtp_user(cls, v):
        if isinstance(v, str):
            return v.strip().replace('"', '').replace("'", '').replace(" ", "")
        return v

    @field_validator("SMTP_PASSWORD", mode="before")
    def clean_smtp_password(cls, v):
        if isinstance(v, str):
            return v.strip().replace('"', '').replace("'", '').replace(" ", "")
        return v

    @field_validator("SMTP_HOST", mode="before")
    def clean_smtp_host(cls, v):
        if isinstance(v, str):
            return v.strip().replace('"', '').replace("'", '').replace(" ", "")
        return v

    # Payment
    PAYMENT_PROVIDER: str = "MOCK"
    PAYMENT_PROVIDER_KEY: str = "mock_payment_key"
    PAYMENT_PROVIDER_SECRET: str = "mock_payment_secret"

    # WebRTC (STUN / TURN) & Calling Signaling
    STUN_URLS: str = "stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302"
    TURN_URLS: str = ""
    TURN_SHARED_SECRET: str = ""
    TURN_STATIC_USERNAME: str = ""
    TURN_STATIC_CREDENTIAL: str = ""
    TURN_CREDENTIAL_TTL_SECONDS: int = 3600
    CALL_RING_TIMEOUT_SECONDS: int = 45
    CALL_RATE_LIMIT_PER_MINUTE: int = 10
    REDIS_URL: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()
