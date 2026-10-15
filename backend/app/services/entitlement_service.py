from datetime import datetime, timezone
from typing import Optional, Set, List
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.models.entities import Subscription, Profile, User, BlockedUser
from app.schemas.profile import ProfileResponse


class EntitlementService:
    def is_user_subscribed(self, user_id: Optional[str], db: Session) -> bool:
        """
        Authoritative check if a user holds an active, unexpired subscription.
        Automatically updates expired records.
        """
        if not user_id:
            return False

        now = datetime.now(timezone.utc)
        subs = (
            db.query(Subscription)
            .filter(
                Subscription.user_id == user_id,
                Subscription.status == "ACTIVE",
            )
            .all()
        )

        has_active = False
        status_changed = False

        for s in subs:
            exp = s.expires_at
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            else:
                exp = exp.astimezone(timezone.utc)

            if exp > now:
                has_active = True
            else:
                s.status = "EXPIRED"
                status_changed = True

        if status_changed:
            db.commit()

        return has_active

    def get_blocked_ids(self, profile_id: Optional[str], db: Session) -> Set[str]:
        if not profile_id:
            return set()
        b1 = db.query(BlockedUser.blocked_profile_id).filter(BlockedUser.blocker_profile_id == profile_id).all()
        b2 = db.query(BlockedUser.blocker_profile_id).filter(BlockedUser.blocked_profile_id == profile_id).all()
        return {r[0] for r in b1}.union({r[0] for r in b2})

    def get_unlocked_profile_ids(
        self,
        viewer_user_id: Optional[str],
        viewer_profile: Optional[Profile],
        db: Session,
    ) -> Set[str]:
        """
        Returns the exact three eligible opposite-gender profiles accessible
        to a non-subscribed user. Deterministically computed by creation order
        so it remains consistent across search, filters, pagination, and direct URLs.
        """
        # Determine target opposite gender
        target_gender = "FEMALE"
        if viewer_profile and viewer_profile.gender:
            target_gender = "FEMALE" if viewer_profile.gender.upper() == "MALE" else "MALE"

        exclude_ids = set()
        if viewer_profile:
            exclude_ids.add(viewer_profile.id)
            exclude_ids.update(self.get_blocked_ids(viewer_profile.id, db))

        query = (
            db.query(Profile.id)
            .join(User, User.id == Profile.user_id)
            .filter(
                Profile.status == "ACTIVE",
                Profile.gender == target_gender,
            )
        )

        if exclude_ids:
            query = query.filter(~Profile.id.in_(exclude_ids))

        # Exactly 3 profiles in deterministic order
        rows = query.order_by(Profile.created_at.asc(), Profile.id.asc()).limit(3).all()
        return {r[0] for r in rows}

    def is_profile_locked(
        self,
        target_profile_id: str,
        viewer_user_id: Optional[str],
        viewer_profile: Optional[Profile],
        db: Session,
    ) -> bool:
        """
        Determines whether target profile is locked for the requesting viewer.
        Owner is never locked.
        Subscribers unlock all eligible profiles.
        Non-subscribers unlock only their designated 3 profiles.
        """
        if viewer_profile and viewer_profile.id == target_profile_id:
            return False

        if viewer_user_id and self.is_user_subscribed(viewer_user_id, db):
            return False

        unlocked_ids = self.get_unlocked_profile_ids(viewer_user_id, viewer_profile, db)
        return target_profile_id not in unlocked_ids

    def sanitize_locked_profile(self, res: ProfileResponse) -> ProfileResponse:
        """
        Strips/masks protected attributes on locked profiles to prevent
        unauthorized leakage through network requests or direct URLs.
        """
        res.is_locked = True
        if res.last_name and len(res.last_name) > 0:
            res.last_name = f"{res.last_name[0]}."
        res.about_me = "Subscribe to BorKonya to unlock this profile's bio, family background, lifestyle, and horoscope details."
        res.company_name = None
        res.annual_income = None
        res.rashi = None
        res.nakshatra = None
        res.is_manglik = "DONT_KNOW"
        if not res.phone_shared:
            res.contact_phone_masked = "Subscribe to view"
            res.revealed_phone = None
            res.phone_shared = False
        if not res.email_shared:
            res.contact_email_masked = "Subscribe to view"
            res.revealed_email = None
            res.email_shared = False
        res.is_contact_revealed = bool(res.phone_shared or res.email_shared)
        res.photos = []
        return res


entitlement_service = EntitlementService()
