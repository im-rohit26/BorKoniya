from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    profiles,
    matches,
    search,
    subscriptions,
    master_data,
    interests,
    shortlist,
    conversations,
    safety,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(profiles.router)
api_router.include_router(matches.router)
api_router.include_router(search.router)
api_router.include_router(subscriptions.router)
api_router.include_router(master_data.router)
api_router.include_router(interests.router)
api_router.include_router(shortlist.router)
api_router.include_router(conversations.router)
api_router.include_router(safety.router)

