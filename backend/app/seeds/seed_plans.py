from app.core.database import SessionLocal
from app.models.entities import SubscriptionPlan, Coupon
import json

PLANS = [
    {
        "id": "monthly_premium",
        "name": "Monthly Premium",
        "price_inr": 200.00,
        "duration_days": 30,
        "features": {
            "unlimited_chat": True,
            "view_contacts": True,
            "who_viewed_me": True,
            "priority_listing": True,
            "verified_family_tag": True,
        },
    },
    {
        "id": "quarterly_gold",
        "name": "Quarterly Gold (3 Months)",
        "price_inr": 500.00,
        "duration_days": 90,
        "features": {
            "unlimited_chat": True,
            "view_contacts": True,
            "who_viewed_me": True,
            "priority_listing": True,
            "verified_family_tag": True,
            "save_pct": 17,
            "highlight_badge": "Most Popular",
        },
    },
    {
        "id": "annual_diamond",
        "name": "Annual Diamond (12 Months)",
        "price_inr": 1500.00,
        "duration_days": 365,
        "features": {
            "unlimited_chat": True,
            "view_contacts": True,
            "who_viewed_me": True,
            "priority_listing": True,
            "verified_family_tag": True,
            "dedicated_matchmaker_support": True,
            "save_pct": 37,
            "highlight_badge": "Best Value",
        },
    },
]


def seed_plans():
    db = SessionLocal()
    try:
        for p in PLANS:
            existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == p["id"]).first()
            if not existing:
                plan = SubscriptionPlan(
                    id=p["id"],
                    name=p["name"],
                    price_inr=p["price_inr"],
                    duration_days=p["duration_days"],
                    features_json=json.dumps(p["features"]),
                    is_active=True,
                )
                db.add(plan)
            else:
                existing.price_inr = p["price_inr"]
                existing.duration_days = p["duration_days"]
                existing.features_json = json.dumps(p["features"])
                existing.name = p["name"]

        # Ensure BOR50 coupon exists
        bor50 = db.query(Coupon).filter(Coupon.code == "BOR50").first()
        if not bor50:
            db.add(Coupon(
                code="BOR50",
                discount_type="PERCENTAGE",
                discount_value=50.00,
                max_discount_inr=100.00,
                is_active=True,
            ))
        else:
            bor50.discount_value = 50.00
            bor50.max_discount_inr = 100.00
            bor50.is_active = True

        db.commit()
        print("Subscription plans and BOR50 coupon successfully seeded to Supabase!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding plans: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_plans()
