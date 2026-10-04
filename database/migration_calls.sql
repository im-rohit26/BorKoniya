-- =========================================================
-- BorKonya Matrimonial Platform — 1-to-1 Voice & Video Calls Migration
-- =========================================================

DO $$ BEGIN
    CREATE TYPE call_type_enum AS ENUM ('VOICE', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE call_status_enum AS ENUM (
        'INITIATED',
        'RINGING',
        'ACCEPTED',
        'REJECTED',
        'BUSY',
        'MISSED',
        'CANCELLED',
        'CONNECTED',
        'ENDED',
        'FAILED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    call_type VARCHAR(10) NOT NULL CHECK (call_type IN ('VOICE', 'VIDEO')),
    status VARCHAR(20) NOT NULL DEFAULT 'INITIATED' CHECK (
        status IN (
            'INITIATED',
            'RINGING',
            'ACCEPTED',
            'REJECTED',
            'BUSY',
            'MISSED',
            'CANCELLED',
            'CONNECTED',
            'ENDED',
            'FAILED'
        )
    ),
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
CREATE INDEX IF NOT EXISTS ix_calls_created_at ON calls(created_at DESC);
