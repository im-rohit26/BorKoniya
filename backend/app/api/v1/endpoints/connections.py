from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.entities import User
from app.schemas.contact_privacy import (
    ContactPermissionUpdate,
    ContactPermissionResponse,
    ConnectionPrivacyItem,
    SharedContactDetailsResponse,
)
from app.services.contact_privacy_service import contact_privacy_service

router = APIRouter(tags=["Connections & Contact Privacy"])


@router.get("/connections/contact-privacy", response_model=List[ConnectionPrivacyItem])
def list_connection_privacy(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all accepted connections with their respective contact sharing permissions
    (what the user shares with them, and what they share with the user).
    """
    return contact_privacy_service.list_connections_with_privacy(current_user.id, db)


@router.get(
    "/connections/{connection_id}/contact-permissions",
    response_model=ContactPermissionResponse,
)
def get_contact_permissions(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current user's contact sharing permissions for a specific connection.
    connection_id can be the interest ID or the other member's profile ID.
    """
    return contact_privacy_service.get_contact_permissions_for_connection(
        current_user.id, connection_id, db
    )


@router.put(
    "/connections/{connection_id}/contact-permissions",
    response_model=ContactPermissionResponse,
)
def update_contact_permissions(
    connection_id: str,
    payload: ContactPermissionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update contact sharing permissions for a specific connection.
    Allows independent toggling of phone_shared and email_shared.
    """
    return contact_privacy_service.update_contact_permissions(
        current_user_id=current_user.id,
        connection_identifier=connection_id,
        phone_shared=payload.phone_shared,
        email_shared=payload.email_shared,
        db=db,
    )


@router.delete(
    "/connections/{connection_id}/contact-permissions",
    response_model=ContactPermissionResponse,
)
def revoke_contact_permissions(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Revoke all contact sharing permissions for a specific connection immediately.
    Sets both phone_shared and email_shared to false.
    """
    return contact_privacy_service.revoke_all_permissions(
        current_user_id=current_user.id,
        connection_identifier=connection_id,
        db=db,
    )


@router.get(
    "/connections/{connection_id}/shared-contact-details",
    response_model=SharedContactDetailsResponse,
)
def get_connection_shared_contact_details(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get shared contact details for a connection if authorized by the owner.
    """
    return contact_privacy_service.get_shared_contact_details(
        current_user.id, connection_id, db
    )


@router.get(
    "/users/{user_id}/shared-contact-details",
    response_model=SharedContactDetailsResponse,
)
def get_user_shared_contact_details(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get shared contact details for a specific user ID if authorized by the owner.
    """
    return contact_privacy_service.get_shared_contact_details(
        current_user.id, user_id, db
    )
