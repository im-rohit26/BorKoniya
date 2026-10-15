from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from datetime import datetime, timezone
from typing import Optional, Tuple, List
from fastapi import HTTPException, status
from app.models.entities import (
    User,
    Profile,
    Interest,
    BlockedUser,
    ContactSharingPermission,
    ContactSharingAuditLog,
)
from app.schemas.contact_privacy import (
    ContactPermissionResponse,
    ContactPermissionUpdate,
    ConnectionPrivacyItem,
    SharedContactDetailsResponse,
)


class ContactPrivacyService:
    @staticmethod
    def _get_user_profile(user_id: str, db: Session) -> Profile:
        profile = db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found for this account.",
            )
        return profile

    @staticmethod
    def _is_blocked(profile_a_id: str, profile_b_id: str, db: Session) -> bool:
        blocked = (
            db.query(BlockedUser)
            .filter(
                ((BlockedUser.blocker_profile_id == profile_a_id) & (BlockedUser.blocked_profile_id == profile_b_id))
                | ((BlockedUser.blocker_profile_id == profile_b_id) & (BlockedUser.blocked_profile_id == profile_a_id))
            )
            .first()
        )
        return bool(blocked)

    def find_connection_and_peer(
        self,
        current_user_id: str,
        connection_identifier: str,
        db: Session,
    ) -> Tuple[Interest, Profile, User]:
        """
        Locates the accepted connection (Interest with status='ACCEPTED')
        using either connection_id or the other party's profile_id / user_id.
        Verifies current user is a participant and neither party is blocked.
        """
        my_profile = self._get_user_profile(current_user_id, db)

        # 1. Try by interest.id
        connection = (
            db.query(Interest)
            .filter(
                Interest.id == connection_identifier,
                Interest.status == "ACCEPTED",
                or_(
                    Interest.sender_profile_id == my_profile.id,
                    Interest.receiver_profile_id == my_profile.id,
                ),
            )
            .first()
        )

        # 2. Try by other party's profile_id or user_id
        if not connection:
            other_profile = (
                db.query(Profile)
                .filter(
                    or_(
                        Profile.id == connection_identifier,
                        Profile.user_id == connection_identifier,
                    )
                )
                .first()
            )
            if other_profile:
                connection = (
                    db.query(Interest)
                    .filter(
                        Interest.status == "ACCEPTED",
                        or_(
                            and_(Interest.sender_profile_id == my_profile.id, Interest.receiver_profile_id == other_profile.id),
                            and_(Interest.sender_profile_id == other_profile.id, Interest.receiver_profile_id == my_profile.id),
                        ),
                    )
                    .first()
                )

        if not connection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Accepted connection not found or access restricted.",
            )

        other_profile_id = (
            connection.receiver_profile_id
            if connection.sender_profile_id == my_profile.id
            else connection.sender_profile_id
        )

        if self._is_blocked(my_profile.id, other_profile_id, db):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access restricted between blocked accounts.",
            )

        other_profile = db.query(Profile).filter(Profile.id == other_profile_id).first()
        if not other_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connected profile not found.",
            )

        other_user = db.query(User).filter(User.id == other_profile.user_id).first()
        if not other_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connected user account not found.",
            )

        return connection, other_profile, other_user

    def check_contact_access(
        self,
        owner_user_id: str,
        viewer_user_id: Optional[str],
        db: Session,
    ) -> Tuple[bool, bool]:
        """
        Determines if viewer_user_id can see owner_user_id's phone and email.
        Returns: (can_view_phone, can_view_email)
        Strict business rules:
        - Owner can always see their own details: (True, True)
        - Anonymous / unauthenticated: (False, False)
        - If users are not accepted connections: (False, False)
        - If users are blocked: (False, False)
        - Premium membership alone DOES NOT grant contact access: (False, False)
        - Only explicitly granted permissions allow viewing: (phone_shared, email_shared)
        """
        if not viewer_user_id:
            return False, False

        if viewer_user_id == owner_user_id:
            return True, True

        owner_profile = db.query(Profile).filter(Profile.user_id == owner_user_id).first()
        viewer_profile = db.query(Profile).filter(Profile.user_id == viewer_user_id).first()

        if not owner_profile or not viewer_profile:
            return False, False

        # Check blocking
        if self._is_blocked(owner_profile.id, viewer_profile.id, db):
            return False, False

        # Check accepted connection
        conn = (
            db.query(Interest)
            .filter(
                Interest.status == "ACCEPTED",
                or_(
                    and_(Interest.sender_profile_id == owner_profile.id, Interest.receiver_profile_id == viewer_profile.id),
                    and_(Interest.sender_profile_id == viewer_profile.id, Interest.receiver_profile_id == owner_profile.id),
                ),
            )
            .first()
        )
        if not conn:
            return False, False

        # Query explicit permission record granted by owner to viewer
        perm = (
            db.query(ContactSharingPermission)
            .filter(
                ContactSharingPermission.owner_user_id == owner_user_id,
                ContactSharingPermission.recipient_user_id == viewer_user_id,
            )
            .first()
        )
        if not perm:
            return False, False

        return bool(perm.phone_shared), bool(perm.email_shared)

    def get_contact_permissions_for_connection(
        self,
        current_user_id: str,
        connection_identifier: str,
        db: Session,
    ) -> ContactPermissionResponse:
        connection, other_profile, other_user = self.find_connection_and_peer(
            current_user_id, connection_identifier, db
        )

        perm = (
            db.query(ContactSharingPermission)
            .filter(
                ContactSharingPermission.owner_user_id == current_user_id,
                ContactSharingPermission.recipient_user_id == other_user.id,
            )
            .first()
        )

        phone_shared = perm.phone_shared if perm else False
        email_shared = perm.email_shared if perm else False
        created_at = perm.created_at if perm else None
        updated_at = perm.updated_at if perm else None
        revoked_at = perm.revoked_at if perm else None

        return ContactPermissionResponse(
            connection_id=connection.id,
            owner_user_id=current_user_id,
            recipient_user_id=other_user.id,
            phone_shared=phone_shared,
            email_shared=email_shared,
            created_at=created_at,
            updated_at=updated_at,
            revoked_at=revoked_at,
        )

    def update_contact_permissions(
        self,
        current_user_id: str,
        connection_identifier: str,
        phone_shared: bool,
        email_shared: bool,
        db: Session,
    ) -> ContactPermissionResponse:
        connection, other_profile, other_user = self.find_connection_and_peer(
            current_user_id, connection_identifier, db
        )

        if current_user_id == other_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot manage contact sharing with yourself.",
            )

        now = datetime.now(timezone.utc)
        perm = (
            db.query(ContactSharingPermission)
            .filter(
                ContactSharingPermission.owner_user_id == current_user_id,
                ContactSharingPermission.recipient_user_id == other_user.id,
            )
            .first()
        )

        action = "UPDATED"
        if not perm:
            perm = ContactSharingPermission(
                owner_user_id=current_user_id,
                recipient_user_id=other_user.id,
                phone_shared=phone_shared,
                email_shared=email_shared,
                created_at=now,
                updated_at=now,
                revoked_at=now if not (phone_shared or email_shared) else None,
            )
            db.add(perm)
            action = "GRANTED" if (phone_shared or email_shared) else "REVOKED"
        else:
            was_shared = perm.phone_shared or perm.email_shared
            is_shared = phone_shared or email_shared

            perm.phone_shared = phone_shared
            perm.email_shared = email_shared
            perm.updated_at = now
            if not is_shared:
                perm.revoked_at = now
                action = "REVOKED"
            else:
                perm.revoked_at = None
                action = "UPDATED" if was_shared else "GRANTED"

        db.flush()

        # Audit log record
        audit = ContactSharingAuditLog(
            permission_id=perm.id,
            owner_user_id=current_user_id,
            recipient_user_id=other_user.id,
            action=action,
            phone_shared=phone_shared,
            email_shared=email_shared,
            changed_at=now,
        )
        db.add(audit)
        db.commit()
        db.refresh(perm)

        return ContactPermissionResponse(
            connection_id=connection.id,
            owner_user_id=perm.owner_user_id,
            recipient_user_id=perm.recipient_user_id,
            phone_shared=perm.phone_shared,
            email_shared=perm.email_shared,
            created_at=perm.created_at,
            updated_at=perm.updated_at,
            revoked_at=perm.revoked_at,
        )

    def revoke_all_permissions(
        self,
        current_user_id: str,
        connection_identifier: str,
        db: Session,
    ) -> ContactPermissionResponse:
        return self.update_contact_permissions(
            current_user_id=current_user_id,
            connection_identifier=connection_identifier,
            phone_shared=False,
            email_shared=False,
            db=db,
        )

    def list_connections_with_privacy(
        self,
        current_user_id: str,
        db: Session,
    ) -> List[ConnectionPrivacyItem]:
        my_profile = self._get_user_profile(current_user_id, db)

        connections = (
            db.query(Interest)
            .filter(
                Interest.status == "ACCEPTED",
                or_(
                    Interest.sender_profile_id == my_profile.id,
                    Interest.receiver_profile_id == my_profile.id,
                ),
            )
            .order_by(Interest.responded_at.desc(), Interest.sent_at.desc())
            .all()
        )

        results: List[ConnectionPrivacyItem] = []
        for conn in connections:
            other_id = (
                conn.receiver_profile_id
                if conn.sender_profile_id == my_profile.id
                else conn.sender_profile_id
            )

            # Skip blocked pairs
            if self._is_blocked(my_profile.id, other_id, db):
                continue

            other_profile = db.query(Profile).filter(Profile.id == other_id).first()
            if not other_profile:
                continue

            other_user = db.query(User).filter(User.id == other_profile.user_id).first()
            if not other_user:
                continue

            # What I am sharing with other_user
            my_perm = (
                db.query(ContactSharingPermission)
                .filter(
                    ContactSharingPermission.owner_user_id == current_user_id,
                    ContactSharingPermission.recipient_user_id == other_user.id,
                )
                .first()
            )

            # What other_user is sharing with me
            their_perm = (
                db.query(ContactSharingPermission)
                .filter(
                    ContactSharingPermission.owner_user_id == other_user.id,
                    ContactSharingPermission.recipient_user_id == current_user_id,
                )
                .first()
            )

            my_sharing = ContactPermissionUpdate(
                phone_shared=bool(my_perm.phone_shared) if my_perm else False,
                email_shared=bool(my_perm.email_shared) if my_perm else False,
            )
            their_sharing = ContactPermissionUpdate(
                phone_shared=bool(their_perm.phone_shared) if their_perm else False,
                email_shared=bool(their_perm.email_shared) if their_perm else False,
            )

            revealed_phone = other_user.phone_number if their_sharing.phone_shared else None
            revealed_email = other_user.email if their_sharing.email_shared else None

            # Primary photo path if any
            photo_url = None
            if hasattr(other_profile, "photos") and other_profile.photos:
                primary_photo = next((p for p in other_profile.photos if p.is_primary), other_profile.photos[0])
                photo_url = primary_photo.storage_path

            results.append(
                ConnectionPrivacyItem(
                    connection_id=conn.id,
                    other_profile_id=other_profile.id,
                    other_user_id=other_user.id,
                    first_name=other_profile.first_name,
                    last_name=other_profile.last_name,
                    gender=other_profile.gender,
                    photo_url=photo_url,
                    community=other_profile.community,
                    occupation=other_profile.occupation,
                    current_city=other_profile.current_city,
                    current_state=other_profile.current_state,
                    connected_at=conn.responded_at or conn.sent_at,
                    my_sharing=my_sharing,
                    their_sharing=their_sharing,
                    revealed_phone=revealed_phone,
                    revealed_email=revealed_email,
                )
            )

        return results

    def get_shared_contact_details(
        self,
        current_user_id: str,
        target_identifier: str,
        db: Session,
    ) -> SharedContactDetailsResponse:
        connection, target_profile, target_user = self.find_connection_and_peer(
            current_user_id, target_identifier, db
        )

        can_view_phone, can_view_email = self.check_contact_access(
            owner_user_id=target_user.id,
            viewer_user_id=current_user_id,
            db=db,
        )

        phone_val = target_user.phone_number if can_view_phone else None
        email_val = target_user.email if can_view_email else None

        if not can_view_phone and not can_view_email:
            msg = "Contact details are private. Only the profile owner can grant sharing permissions."
        elif can_view_phone and can_view_email:
            msg = "Both phone number and email address are shared."
        elif can_view_phone:
            msg = "Phone number is shared. Email address remains private."
        else:
            msg = "Email address is shared. Phone number remains private."

        return SharedContactDetailsResponse(
            user_id=target_user.id,
            profile_id=target_profile.id,
            phone_number=phone_val,
            email=email_val,
            phone_shared=can_view_phone,
            email_shared=can_view_email,
            message=msg,
        )


contact_privacy_service = ContactPrivacyService()
