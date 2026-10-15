from sqlalchemy import text
from app.core.database import engine

def run_migration():
    statements = [
        "ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS duration_months INTEGER DEFAULT 1;",
        "ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS savings_inr NUMERIC(10, 2) DEFAULT 0.00;",
        "ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS plan_id VARCHAR(50);",
        "ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS order_id VARCHAR(100);",
        "ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);",
        "CREATE INDEX IF NOT EXISTS ix_payment_transactions_order_id ON payment_transactions (order_id);",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            print(f"Executing: {stmt}")
            conn.execute(text(stmt))
    print("Subscription tables migration applied successfully!")

if __name__ == "__main__":
    run_migration()
