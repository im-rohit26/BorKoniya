from app.core.database import SessionLocal
from app.models.entities import SubscriptionPlan, Coupon
import json

PLANS = [
    {
        "id": "monthly",
        "name": "Monthly",
        "price_inr": 200.00,
        "duration_months": 1,
        "duration_days": 30,
        "savings_inr": 0.00,
        "features": {
            "unlimited_chat": True,
            "view_contacts": True,
            "who_viewed_me": True,
            "priority_listing": True,
            "verified_family_tag": True,
            "duration_label": "1 month",
            "savings_label": "₹0 savings",
        },
    },
    {
        "id": "quarterly",
        "name": "Quarterly",
        "price_inr": 500.00,
        "duration_months": 3,
        "duration_days": 90,
        "savings_inr": 100.00,
        "features": {
            "unlimited_chat": True,
            "view_contacts": True,
            "who_viewed_me": True,
            "priority_listing": True,
            "verified_family_tag": True,
            "duration_label": "3 months",
            "savings_label": "Save ₹100",
            "save_amount": 100,
            "highlight_badge": "Most Popular",
        },
    },
    {
        "id": "half_yearly",
        "name": "Half-yearly",
        "price_inr": 900.00,
        "duration_months": 6,
        "duration_days": 180,
        "savings_inr": 300.00,
        "features": {
            "unlimited_chat": True,
            "view_contacts": True,
            "who_viewed_me": True,
            "priority_listing": True,
            "verified_family_tag": True,
            "duration_label": "6 months",
            "savings_label": "Save ₹300",
            "save_amount": 300,
            "highlight_badge": "Best Value",
        },
    },
]


def seed_plans():
    db = SessionLocal()
    try:
        active_ids = {p["id"] for p in PLANS}
        
        # Deactivate any legacy plans not in the 3 exact plans
        db.query(SubscriptionPlan).filter(~SubscriptionPlan.id.in_(active_ids)).update(
            {"is_active": False}, synchronize_session=False
        )

        for p in PLANS:
            existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == p["id"]).first()
            if not existing:
                plan = SubscriptionPlan(
                    id=p["id"],
                    name=p["name"],
                    price_inr=p["price_inr"],
                    duration_months=p["duration_months"],
                    duration_days=p["duration_days"],
                    savings_inr=p["savings_inr"],
                    features_json=p["features"],
                    is_active=True,
                )
                db.add(plan)
            else:
                existing.name = p["name"]
                existing.price_inr = p["price_inr"]
                existing.duration_months = p["duration_months"]
                existing.duration_days = p["duration_days"]
                existing.savings_inr = p["savings_inr"]
                existing.features_json = p["features"]
                existing.is_active = True

        # Ensure community coupon BOR50 exists
        bor50 = db.query(Coupon).filter(Coupon.code == "BOR50").first()
        if not bor50:
            db.add(Coupon(
                code="BOR50",
                discount_type="PERCENTAGE",
                discount_value=50.00,
                max_discount_inr=None,
                is_active=True,
            ))
        else:
            bor50.discount_type = "PERCENTAGE"
            bor50.discount_value = 50.00
            bor50.max_discount_inr = None
            bor50.is_active = True

        db.commit()
        print("Subscription plans (Monthly INR 200, Quarterly INR 500, Half-yearly INR 900) seeded successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding plans: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_plans()
