from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import date
from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models.entities import User, Profile, ProfilePrivacy, Community, SubCommunity, Coupon
from app.core.security import get_password_hash
from app.api.v1.router import api_router
from app.seeds.seed_interactions import seed_interactions_and_more_profiles


def init_db_and_seed():
    db = SessionLocal()
    try:
        from sqlalchemy import text, inspect
        db.execute(text("SELECT 1"))

        # Fast table existence check: skip expensive create_all if schema already initialized
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        if not existing_tables or "profiles" not in existing_tables:
            Base.metadata.create_all(bind=engine)
            existing_tables = set(inspector.get_table_names())

        if "communities" in existing_tables and db.query(Community).count() == 0:
            c1 = Community(name="Sadgope", is_active=True)
            c2 = Community(name="Gowala / Goala", is_active=True)
            db.add_all([c1, c2])
            db.flush()

            sc_list = [
                SubCommunity(community_id=c1.id, name="Kulin Sadgope"),
                SubCommunity(community_id=c1.id, name="Ghosh"),
                SubCommunity(community_id=c1.id, name="Pal"),
                SubCommunity(community_id=c1.id, name="Sarkar"),
                SubCommunity(community_id=c1.id, name="Mollik"),
                SubCommunity(community_id=c2.id, name="Ahir"),
                SubCommunity(community_id=c2.id, name="Gope"),
            ]
            db.add_all(sc_list)

        if "coupons" in existing_tables and db.query(Coupon).filter(Coupon.code == "BOR50").count() == 0:
            c = Coupon(
                code="BOR50",
                discount_type="PERCENTAGE",
                discount_value=50.00,
                max_discount_inr=100.00,
                is_active=True,
            )
            db.add(c)

        db.commit()

        # Seed demo interactions only if not already seeded
        if "profiles" in existing_tables:
            debjit = db.query(Profile).filter(Profile.first_name == "Debjit").first()
            if not debjit:
                seed_interactions_and_more_profiles()
    except Exception as e:
        db.rollback()
        print(f"Startup initialization note: {e}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize Database & Seed
    init_db_and_seed()
    yield
    # Shutdown logic if any


# Initialize Application
app = FastAPI(
    title=settings.APP_NAME,
    description="Community Matrimonial Platform API for Sadgope, Gowala & Goala families",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# GZip Response Compression (saves 70-85% bandwidth on profiles & messages)
from fastapi.middleware.gzip import GZipMiddleware
app.add_middleware(GZipMiddleware, minimum_size=1000)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS if isinstance(settings.ALLOWED_ORIGINS, list) else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)

# Dedicated root WebSocket endpoint for 1-to-1 Voice & Video Call Signaling (/ws/calls)
from fastapi import WebSocket, Query
from typing import Optional
from app.api.v1.endpoints.calls import handle_calls_websocket


@app.websocket("/ws/calls")
async def root_ws_calls(
    websocket: WebSocket,
    token: Optional[str] = Query(default=None),
):
    await handle_calls_websocket(websocket, token)


# Static Files for Uploads fallback
import os
from fastapi.staticfiles import StaticFiles

uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(os.path.join(uploads_dir, "photos"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")



@app.get("/")
def root():
    return {
        "brand": "BorKonya",
        "tagline": "Find Your Life Partner Within Your Community",
        "community": "Sadgope / Gowala / Goala",
        "status": "ONLINE",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "BorKonya Backend",
        "environment": settings.ENVIRONMENT,
    }
