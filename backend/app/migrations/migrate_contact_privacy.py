from sqlalchemy import text
from app.core.database import engine

def run_migration():
    statements = [
        """
        CREATE TABLE IF NOT EXISTS contact_sharing_permissions (
            id VARCHAR(36) PRIMARY KEY,
            owner_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            recipient_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            phone_shared BOOLEAN NOT NULL DEFAULT FALSE,
            email_shared BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            revoked_at TIMESTAMP WITH TIME ZONE,
            CONSTRAINT uq_contact_sharing_owner_recipient UNIQUE (owner_user_id, recipient_user_id),
            CONSTRAINT ck_contact_sharing_different_users CHECK (owner_user_id <> recipient_user_id)
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_contact_sharing_owner ON contact_sharing_permissions (owner_user_id);",
        "CREATE INDEX IF NOT EXISTS ix_contact_sharing_recipient ON contact_sharing_permissions (recipient_user_id);",
        """
        CREATE TABLE IF NOT EXISTS contact_sharing_audit_logs (
            id VARCHAR(36) PRIMARY KEY,
            permission_id VARCHAR(36) REFERENCES contact_sharing_permissions(id) ON DELETE SET NULL,
            owner_user_id VARCHAR(36) NOT NULL,
            recipient_user_id VARCHAR(36) NOT NULL,
            action VARCHAR(50) NOT NULL,
            phone_shared BOOLEAN NOT NULL,
            email_shared BOOLEAN NOT NULL,
            changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
        """,
        "CREATE INDEX IF NOT EXISTS ix_contact_sharing_audit_owner ON contact_sharing_audit_logs (owner_user_id);",
        "ALTER TABLE contact_sharing_permissions ENABLE ROW LEVEL SECURITY;",
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'contact_sharing_permissions' AND policyname = 'contact_sharing_owner_policy'
            ) THEN
                CREATE POLICY contact_sharing_owner_policy ON contact_sharing_permissions
                    FOR ALL
                    USING (owner_user_id = auth.uid()::text)
                    WITH CHECK (owner_user_id = auth.uid()::text);
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE tablename = 'contact_sharing_permissions' AND policyname = 'contact_sharing_recipient_read_policy'
            ) THEN
                CREATE POLICY contact_sharing_recipient_read_policy ON contact_sharing_permissions
                    FOR SELECT
                    USING (recipient_user_id = auth.uid()::text);
            END IF;
        END $$;
        """,
    ]
    with engine.begin() as conn:
        for stmt in statements:
            print(f"Executing: {stmt.strip().splitlines()[0]}...")
            conn.execute(text(stmt))
    print("Contact sharing permissions migration applied successfully!")

if __name__ == "__main__":
    run_migration()
