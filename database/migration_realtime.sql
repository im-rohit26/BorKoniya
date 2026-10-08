-- Migration: Enable Realtime for Messages & Conversations
-- Enables instant message delivery in frontend without page refresh

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE conversations;

-- RLS SELECT policy so anon client can receive postgres_changes events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'realtime_anon_select_messages'
    ) THEN
        CREATE POLICY realtime_anon_select_messages ON messages FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'realtime_anon_select_conversations'
    ) THEN
        CREATE POLICY realtime_anon_select_conversations ON conversations FOR SELECT USING (true);
    END IF;
END $$;
