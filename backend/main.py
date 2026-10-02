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
    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Seed Initial Data if empty
    db = SessionLocal()
    try:
        if db.query(Community).count() == 0:
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

        if db.query(Coupon).filter(Coupon.code == "BOR50").count() == 0:
            c = Coupon(
                code="BOR50",
                discount_type="PERCENTAGE",
                discount_value=50.00,
                max_discount_inr=100.00,
                is_active=True,
            )
            db.add(c)

        if db.query(Profile).count() == 0:
            demo_user = User(
                email="priyanka.ghosh@demo.com",
                phone_number="9876543210",
                is_phone_verified=True,
                is_email_verified=True,
                password_hash=get_password_hash("borkonya123"),
            )
            db.add(demo_user)
            db.flush()

            demo_profile = Profile(
                user_id=demo_user.id,
                first_name="Priyanka",
                last_name="Ghosh",
                gender="FEMALE",
                date_of_birth=date(1998, 5, 14),
                height_cm=163,
                marital_status="NEVER_MARRIED",
                mother_tongue="Bengali",
                community="Sadgope",
                sub_community="Kulin Sadgope",
                native_place="Bardhaman",
                current_state="West Bengal",
                current_city="Kolkata",
                highest_qualification="M.Tech in Computer Science",
                occupation="Senior Software Engineer",
                company_name="Tata Consultancy Services",
                diet="NON_VEGETARIAN",
                about_me="Working as a software professional in Kolkata. Values traditional family ethics while holding a modern progressive mindset.",
                profile_completion_pct=90,
            )
            db.add(demo_profile)
            db.flush()

            privacy = ProfilePrivacy(
                profile_id=demo_profile.id,
                phone_visibility="PREMIUM_ONLY",
                email_visibility="PRIVATE",
            )
            db.add(privacy)

            demo_user2 = User(
                email="subham.pal@demo.com",
                phone_number="9876543211",
                is_phone_verified=True,
                is_email_verified=True,
                password_hash=get_password_hash("borkonya123"),
            )
            db.add(demo_user2)
            db.flush()

            demo_profile2 = Profile(
                user_id=demo_user2.id,
                first_name="Subham",
                last_name="Pal",
                gender="MALE",
                date_of_birth=date(1995, 8, 20),
                height_cm=178,
                marital_status="NEVER_MARRIED",
                mother_tongue="Odia",
                community="Sadgope",
                sub_community="Pal",
                native_place="Balasore",
                current_state="Odisha",
                current_city="Bhubaneswar",
                highest_qualification="B.Tech + MBA",
                occupation="Product Manager",
                company_name="Fintech Enterprise",
                diet="NON_VEGETARIAN",
                about_me="Raised in a cultured family in Odisha. Tech enthusiast with a grounded lifestyle.",
                profile_completion_pct=85,
            )
            db.add(demo_profile2)
            db.flush()

            privacy2 = ProfilePrivacy(
                profile_id=demo_profile2.id,
                phone_visibility="PREMIUM_ONLY",
                email_visibility="PRIVATE",
            )
            db.add(privacy2)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Startup seed error: {e}")
    finally:
        db.close()

    try:
        seed_interactions_and_more_profiles()
    except Exception as e:
        print(f"Interactions seed error: {e}")


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
