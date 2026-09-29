import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    SmallInteger,
    Numeric,
    DateTime,
    Date,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=True, index=True)
    phone_country_code = Column(String(8), default="+91")
    phone_number = Column(String(15), unique=True, nullable=False, index=True)
    is_phone_verified = Column(Boolean, default=False)
    is_email_verified = Column(Boolean, default=False)
    password_hash = Column(String(255), nullable=False)
    selected_language = Column(String(10), default="en")
    role = Column(String(30), default="MEMBER")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")


class Community(Base):
    __tablename__ = "communities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True)

    sub_communities = relationship("SubCommunity", back_populates="community", cascade="all, delete-orphan")


class SubCommunity(Base):
    __tablename__ = "sub_communities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    community_id = Column(Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)

    community = relationship("Community", back_populates="sub_communities")


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    profile_for = Column(String(30), default="MYSELF")  # MYSELF, SON, DAUGHTER, etc.
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    gender = Column(String(20), nullable=False)  # MALE, FEMALE
    date_of_birth = Column(Date, nullable=False)
    height_cm = Column(SmallInteger, default=165)
    marital_status = Column(String(30), default="NEVER_MARRIED")
    mother_tongue = Column(String(50), default="Bengali")
    status = Column(String(30), default="ACTIVE")  # INCOMPLETE, ACTIVE, HIDDEN, BLOCKED
    profile_completion_pct = Column(SmallInteger, default=25)
    about_me = Column(Text, nullable=True)

    # Location & Community
    current_state = Column(String(100), default="West Bengal")
    current_city = Column(String(100), default="Kolkata")
    native_place = Column(String(150), nullable=True)
    community = Column(String(100), default="Sadgope")
    sub_community = Column(String(100), nullable=True)

    # Education & Career
    highest_qualification = Column(String(150), default="Bachelor’s Degree")
    occupation = Column(String(150), default="Private Sector")
    company_name = Column(String(200), nullable=True)
    annual_income = Column(String(50), nullable=True)

    # Lifestyle & Horoscope
    diet = Column(String(30), default="NON_VEGETARIAN")
    smoking = Column(String(20), default="NO")
    drinking = Column(String(20), default="NO")
    rashi = Column(String(50), nullable=True)
    nakshatra = Column(String(50), nullable=True)
    is_manglik = Column(String(20), default="DONT_KNOW")

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="profile")
    photos = relationship("ProfilePhoto", back_populates="profile", cascade="all, delete-orphan")
    privacy = relationship("ProfilePrivacy", back_populates="profile", uselist=False, cascade="all, delete-orphan")


class ProfilePhoto(Base):
    __tablename__ = "profile_photos"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    storage_path = Column(String(500), nullable=False)
    is_primary = Column(Boolean, default=False)
    privacy = Column(String(30), default="REGISTERED_ONLY")  # PUBLIC, REGISTERED_ONLY, PROTECTED

    profile = relationship("Profile", back_populates="photos")


class ProfilePrivacy(Base):
    __tablename__ = "profile_privacy"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), unique=True, nullable=False)
    name_display = Column(String(30), default="FIRST_NAME_ONLY")
    photo_visibility = Column(String(30), default="REGISTERED_ONLY")
    phone_visibility = Column(String(30), default="PREMIUM_ONLY")
    email_visibility = Column(String(30), default="PRIVATE")

    profile = relationship("Profile", back_populates="privacy")


class Interest(Base):
    __tablename__ = "interests"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    sender_profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    receiver_profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(20), default="SENT")  # SENT, ACCEPTED, DECLINED, CANCELLED
    sent_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    responded_at = Column(DateTime, nullable=True)

    sender_profile = relationship("Profile", foreign_keys=[sender_profile_id])
    receiver_profile = relationship("Profile", foreign_keys=[receiver_profile_id])


class Shortlist(Base):
    __tablename__ = "shortlists"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    target_profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user_profile = relationship("Profile", foreign_keys=[user_profile_id])
    target_profile = relationship("Profile", foreign_keys=[target_profile_id])


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    members = relationship("ConversationMember", back_populates="conversation", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class ConversationMember(Base):
    __tablename__ = "conversation_members"

    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True)
    profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    joined_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="members")
    profile = relationship("Profile")


class Message(Base):
    __tablename__ = "messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("Profile")


class BlockedUser(Base):
    __tablename__ = "blocked_users"

    blocker_profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    blocked_profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    blocker = relationship("Profile", foreign_keys=[blocker_profile_id])
    blocked = relationship("Profile", foreign_keys=[blocked_profile_id])


class ReportedProfile(Base):
    __tablename__ = "reported_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    reporter_profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    reported_profile_id = Column(String(36), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="PENDING")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    reporter = relationship("Profile", foreign_keys=[reporter_profile_id])
    reported = relationship("Profile", foreign_keys=[reported_profile_id])


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    price_inr = Column(Numeric(10, 2), default=200.00, nullable=False)
    duration_days = Column(Integer, default=30)
    features_json = Column(Text, default='{"unlimited_chat": true, "view_contacts": true}')
    is_active = Column(Boolean, default=True)


class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    code = Column(String(30), unique=True, nullable=False)
    discount_type = Column(String(20), default="PERCENTAGE")
    discount_value = Column(Numeric(10, 2), default=50.00)
    max_discount_inr = Column(Numeric(10, 2), default=100.00)
    is_active = Column(Boolean, default=True)


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(String(50), ForeignKey("subscription_plans.id"), nullable=False)
    status = Column(String(30), default="ACTIVE")
    starts_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount_inr = Column(Numeric(10, 2), nullable=False)
    discount_inr = Column(Numeric(10, 2), default=0.00)
    net_amount_inr = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="SUCCESS")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class SavedSearch(Base):
    __tablename__ = "saved_searches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    search_name = Column(String(100), default="My Search")
    criteria_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


