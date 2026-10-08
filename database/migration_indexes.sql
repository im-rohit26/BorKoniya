-- ==============================================================================
-- BorKonya Production Database Optimization Migration
-- Target: Supabase PostgreSQL (AWS ap-south-1 Mumbai)
-- ==============================================================================

-- 1. Profiles: Compound index for matching, search, and gender filtering
CREATE INDEX IF NOT EXISTS ix_profiles_status_gender 
ON profiles (status, gender);

-- 2. Profiles: Community filter index
CREATE INDEX IF NOT EXISTS ix_profiles_community 
ON profiles (community);

-- 3. Profiles: Date of birth index for age range queries
CREATE INDEX IF NOT EXISTS ix_profiles_dob 
ON profiles (date_of_birth);

-- 4. Profiles: Creation timestamp for new profile listings
CREATE INDEX IF NOT EXISTS ix_profiles_created_at 
ON profiles (created_at DESC);

-- 5. Profile Photos: Primary photo lookup index (eliminates N+1 queries)
CREATE INDEX IF NOT EXISTS ix_profile_photos_profile_primary 
ON profile_photos (profile_id, is_primary);

-- 6. Interests: Sender profile and status index
CREATE INDEX IF NOT EXISTS ix_interests_sender_status 
ON interests (sender_profile_id, status);

-- 7. Interests: Receiver profile and status index
CREATE INDEX IF NOT EXISTS ix_interests_receiver_status 
ON interests (receiver_profile_id, status);

-- 8. Shortlists: User profile and target profile bookmark lookup
CREATE INDEX IF NOT EXISTS ix_shortlists_user_target 
ON shortlists (user_profile_id, target_profile_id);

-- 9. Conversation Members: Profile lookup and unread/hidden status
CREATE INDEX IF NOT EXISTS ix_conversation_members_profile 
ON conversation_members (profile_id, is_hidden);

-- 10. Messages: Conversation timeline ordering
CREATE INDEX IF NOT EXISTS ix_messages_conv_created 
ON messages (conversation_id, created_at DESC);

-- 11. Subscriptions: User active subscription entitlement check
CREATE INDEX IF NOT EXISTS ix_subscriptions_user_status 
ON subscriptions (user_id, status);

-- 12. OTP Store: Identifier, purpose, and recency index for rate limiting
CREATE INDEX IF NOT EXISTS ix_otp_store_lookup 
ON otp_store (identifier, purpose, created_at DESC);
