-- =========================================================
-- BorKonya Matrimonial Platform — Initial PostgreSQL Schema
-- Community: Sadgope / Gowala / Goala
-- =========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('MEMBER', 'MODERATOR', 'ADMIN', 'SUPER_ADMIN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE profile_for_enum AS ENUM ('MYSELF', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER', 'RELATIVE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE marital_status_enum AS ENUM ('NEVER_MARRIED', 'DIVORCED', 'WIDOWED', 'AWAITING_DIVORCE', 'ANNULLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE profile_status_enum AS ENUM ('INCOMPLETE', 'ACTIVE', 'HIDDEN', 'BLOCKED', 'UNDER_REVIEW', 'DELETED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE interest_status_enum AS ENUM ('SENT', 'ACCEPTED', 'DECLINED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE photo_privacy_enum AS ENUM ('PUBLIC', 'REGISTERED_ONLY', 'PROTECTED', 'ON_INTEREST');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status_enum AS ENUM ('TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'PAYMENT_FAILED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_enum AS ENUM ('CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE diet_enum AS ENUM ('VEGETARIAN', 'NON_VEGETARIAN', 'EGGETARIAN', 'JAIN', 'VEGAN');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE discount_type_enum AS ENUM ('PERCENTAGE', 'FLAT');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Master Data Tables
CREATE TABLE IF NOT EXISTS communities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS sub_communities (
    id SERIAL PRIMARY KEY,
    community_id INT REFERENCES communities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(community_id, name)
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    phone_country_code VARCHAR(8) DEFAULT '+91',
    phone_number VARCHAR(15) UNIQUE NOT NULL,
    is_phone_verified BOOLEAN DEFAULT FALSE,
    is_email_verified BOOLEAN DEFAULT FALSE,
    password_hash VARCHAR(255) NOT NULL,
    selected_language VARCHAR(10) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    profile_for profile_for_enum NOT NULL DEFAULT 'MYSELF',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender gender_enum NOT NULL,
    date_of_birth DATE NOT NULL,
    height_cm SMALLINT NOT NULL DEFAULT 165,
    marital_status marital_status_enum NOT NULL DEFAULT 'NEVER_MARRIED',
    has_children BOOLEAN DEFAULT FALSE,
    children_count SMALLINT DEFAULT 0,
    mother_tongue VARCHAR(50) NOT NULL DEFAULT 'Bengali',
    status profile_status_enum DEFAULT 'INCOMPLETE',
    profile_completion_pct SMALLINT DEFAULT 25,
    about_me TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Location Details
CREATE TABLE IF NOT EXISTS location_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    current_country VARCHAR(100) DEFAULT 'India',
    current_state VARCHAR(100) NOT NULL,
    current_district VARCHAR(100),
    current_city VARCHAR(100) NOT NULL,
    native_place VARCHAR(150),
    family_origin_state VARCHAR(100),
    pincode VARCHAR(20)
);

-- Religious Details
CREATE TABLE IF NOT EXISTS religious_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    religion VARCHAR(50) DEFAULT 'Hindu',
    community_id INT REFERENCES communities(id),
    sub_community_id INT REFERENCES sub_communities(id),
    gotra VARCHAR(100),
    is_manglik VARCHAR(20) DEFAULT 'DONT_KNOW'
);

-- Education Details
CREATE TABLE IF NOT EXISTS education_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    highest_qualification VARCHAR(100) NOT NULL,
    education_field VARCHAR(100),
    college_university VARCHAR(255)
);

-- Professional Details
CREATE TABLE IF NOT EXISTS professional_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    occupation VARCHAR(100) NOT NULL,
    company_name VARCHAR(255),
    work_location_city VARCHAR(100),
    work_location_country VARCHAR(100) DEFAULT 'India',
    annual_income_currency VARCHAR(10) DEFAULT 'INR',
    annual_income_min NUMERIC(12, 2),
    annual_income_max NUMERIC(12, 2)
);

-- Family Details
CREATE TABLE IF NOT EXISTS family_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    father_occupation VARCHAR(100),
    mother_occupation VARCHAR(100),
    brothers_count SMALLINT DEFAULT 0,
    sisters_count SMALLINT DEFAULT 0,
    family_type VARCHAR(50) DEFAULT 'NUCLEAR',
    family_values VARCHAR(50) DEFAULT 'TRADITIONAL',
    family_location VARCHAR(150)
);

-- Lifestyle Details
CREATE TABLE IF NOT EXISTS lifestyle_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    diet diet_enum DEFAULT 'NON_VEGETARIAN',
    smoking VARCHAR(30) DEFAULT 'NO',
    drinking VARCHAR(30) DEFAULT 'NO',
    hobbies TEXT[]
);

-- Horoscope Details
CREATE TABLE IF NOT EXISTS horoscope_details (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    date_of_birth DATE,
    time_of_birth TIME,
    place_of_birth VARCHAR(150),
    rashi VARCHAR(50),
    nakshatra VARCHAR(50)
);

-- Profile Photos
CREATE TABLE IF NOT EXISTS profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    storage_path VARCHAR(500) NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    display_order SMALLINT DEFAULT 0,
    privacy photo_privacy_enum DEFAULT 'REGISTERED_ONLY',
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Privacy Controls
CREATE TABLE IF NOT EXISTS profile_privacy (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    name_display VARCHAR(30) DEFAULT 'FIRST_NAME_ONLY',
    photo_visibility photo_privacy_enum DEFAULT 'REGISTERED_ONLY',
    phone_visibility VARCHAR(30) DEFAULT 'PREMIUM_ONLY',
    email_visibility VARCHAR(30) DEFAULT 'PRIVATE',
    income_visibility VARCHAR(30) DEFAULT 'REGISTERED_ONLY',
    horoscope_visibility VARCHAR(30) DEFAULT 'REGISTERED_ONLY'
);

-- Partner Preferences
CREATE TABLE IF NOT EXISTS partner_preferences (
    profile_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    age_min SMALLINT DEFAULT 21,
    age_max SMALLINT DEFAULT 35,
    height_min_cm SMALLINT DEFAULT 150,
    height_max_cm SMALLINT DEFAULT 190,
    marital_status marital_status_enum[] DEFAULT '{NEVER_MARRIED}',
    mother_tongues VARCHAR(50)[] DEFAULT '{Bengali,Hindi,Odia}',
    diets diet_enum[] DEFAULT '{VEGETARIAN,NON_VEGETARIAN}',
    preferred_states VARCHAR(100)[],
    min_income_inr NUMERIC(12, 2)
);

-- Matches & Scores
CREATE TABLE IF NOT EXISTS match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    candidate_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    score_percentage SMALLINT NOT NULL,
    breakdown_json JSONB NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, candidate_profile_id)
);

-- Interests
CREATE TABLE IF NOT EXISTS interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status interest_status_enum DEFAULT 'SENT',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    UNIQUE(sender_profile_id, receiver_profile_id)
);

-- Shortlists
CREATE TABLE IF NOT EXISTS shortlisted_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_profile_id, target_profile_id)
);

-- Conversations & Messages
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversation_members (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(conversation_id, profile_id)
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1-to-1 Voice & Video Calls (No phone numbers stored)
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    call_type VARCHAR(10) NOT NULL CHECK (call_type IN ('VOICE', 'VIDEO')),
    status VARCHAR(20) NOT NULL DEFAULT 'INITIATED',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration INTEGER DEFAULT 0,
    end_reason VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS ix_calls_receiver_id ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS ix_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS ix_calls_conversation_id ON calls(conversation_id);

-- Safety & Moderation
CREATE TABLE IF NOT EXISTS blocked_users (
    blocker_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY(blocker_profile_id, blocked_profile_id)
);

CREATE TABLE IF NOT EXISTS reported_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(30) DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions & Payments
CREATE TABLE IF NOT EXISTS subscription_plans (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_inr NUMERIC(10, 2) NOT NULL DEFAULT 200.00,
    duration_days INT NOT NULL DEFAULT 30,
    features_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) UNIQUE NOT NULL,
    discount_type discount_type_enum NOT NULL DEFAULT 'PERCENTAGE',
    discount_value NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    max_discount_inr NUMERIC(10, 2),
    min_order_inr NUMERIC(10, 2) DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    usage_limit INT DEFAULT 1000,
    used_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) NOT NULL REFERENCES subscription_plans(id),
    status subscription_status_enum DEFAULT 'TRIAL',
    starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES subscriptions(id),
    amount_inr NUMERIC(10, 2) NOT NULL,
    coupon_id UUID REFERENCES coupons(id),
    discount_inr NUMERIC(10, 2) DEFAULT 0.00,
    net_amount_inr NUMERIC(10, 2) NOT NULL,
    gateway_provider VARCHAR(50) DEFAULT 'MOCK',
    gateway_order_id VARCHAR(100),
    gateway_payment_id VARCHAR(100),
    status payment_status_enum DEFAULT 'CREATED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Seed Communities
INSERT INTO communities (id, name, is_active) VALUES 
(1, 'Sadgope', TRUE),
(2, 'Gowala / Goala', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO sub_communities (community_id, name, is_active) VALUES
(1, 'Kulin Sadgope', TRUE),
(1, 'Mollik', TRUE),
(1, 'Sarkar', TRUE),
(1, 'Ghosh', TRUE),
(1, 'Pal', TRUE),
(2, 'Ahir', TRUE),
(2, 'Gope', TRUE),
(2, 'Gowala General', TRUE)
ON CONFLICT DO NOTHING;

-- Seed Default Subscription Plan (₹200/month)
INSERT INTO subscription_plans (id, name, price_inr, duration_days, features_json, is_active) VALUES
('monthly_premium', 'BorKonya Monthly Premium', 200.00, 30, '{"unlimited_chat": true, "view_contacts": true, "advanced_search": true, "profile_boost": true, "who_viewed_me": true}', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Seed Default 50% Coupon (BOR50)
INSERT INTO coupons (code, discount_type, discount_value, max_discount_inr, valid_from, usage_limit, is_active) VALUES
('BOR50', 'PERCENTAGE', 50.00, 100.00, NOW(), 5000, TRUE)
ON CONFLICT (code) DO NOTHING;
