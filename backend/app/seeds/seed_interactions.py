from datetime import datetime, date, timezone
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.entities import (
    User,
    Profile,
    ProfilePrivacy,
    Interest,
    Shortlist,
    Conversation,
    ConversationMember,
    Message,
)


def seed_interactions_and_more_profiles():
    db = SessionLocal()
    try:
        # Check existing profiles
        priyanka = db.query(Profile).filter(Profile.first_name == "Priyanka").first()
        subham = db.query(Profile).filter(Profile.first_name == "Subham").first()

        if not priyanka:
            print("Priyanka profile not found, skipping interaction seed.")
            return

        # 1. Add extra diverse community profiles if not present
        existing_debjit = db.query(Profile).filter(Profile.first_name == "Debjit").first()
        if not existing_debjit:
            user_debjit = User(
                email="debjit.ghosh@demo.com",
                phone_number="9876543212",
                is_phone_verified=True,
                is_email_verified=True,
                password_hash=get_password_hash("borkonya123"),
            )
            db.add(user_debjit)
            db.flush()

            debjit = Profile(
                user_id=user_debjit.id,
                first_name="Debjit",
                last_name="Ghosh",
                gender="MALE",
                date_of_birth=date(1994, 11, 23),
                height_cm=180,
                marital_status="NEVER_MARRIED",
                mother_tongue="Bengali",
                community="Gowala / Goala",
                sub_community="Ghosh",
                native_place="Purulia",
                current_state="Maharashtra",
                current_city="Mumbai",
                highest_qualification="MBA in Finance",
                occupation="Investment Banker",
                company_name="Leading Global Bank",
                annual_income="25-35 Lakhs INR",
                diet="NON_VEGETARIAN",
                about_me="Based in Mumbai for work, rooted in Bengal traditions. Looking for a respectful, educated life partner.",
                profile_completion_pct=95,
            )
            db.add(debjit)
            db.flush()

            db.add(ProfilePrivacy(
                profile_id=debjit.id,
                phone_visibility="PREMIUM_ONLY",
                email_visibility="PRIVATE",
            ))
            existing_debjit = debjit

        existing_ananya = db.query(Profile).filter(Profile.first_name == "Ananya").first()
        if not existing_ananya:
            user_ananya = User(
                email="ananya.das@demo.com",
                phone_number="9876543213",
                is_phone_verified=True,
                is_email_verified=True,
                password_hash=get_password_hash("borkonya123"),
            )
            db.add(user_ananya)
            db.flush()

            ananya = Profile(
                user_id=user_ananya.id,
                first_name="Ananya",
                last_name="Das",
                gender="FEMALE",
                date_of_birth=date(1999, 3, 12),
                height_cm=160,
                marital_status="NEVER_MARRIED",
                mother_tongue="Bengali",
                community="Sadgope",
                sub_community="Sadgope",
                native_place="Hooghly",
                current_state="West Bengal",
                current_city="Kolkata",
                highest_qualification="B.Des in Product Design",
                occupation="Senior Product Designer",
                company_name="Design Studio",
                annual_income="12-18 Lakhs INR",
                diet="VEGETARIAN",
                about_me="Creative professional living in Kolkata. Believes in mutual respect and shared dreams.",
                profile_completion_pct=88,
            )
            db.add(ananya)
            db.flush()

            db.add(ProfilePrivacy(
                profile_id=ananya.id,
                phone_visibility="PREMIUM_ONLY",
                email_visibility="PRIVATE",
            ))

        existing_sourav = db.query(Profile).filter(Profile.first_name == "Sourav").first()
        if not existing_sourav:
            user_sourav = User(
                email="sourav.ghosh@demo.com",
                phone_number="9876543214",
                is_phone_verified=True,
                is_email_verified=True,
                password_hash=get_password_hash("borkonya123"),
            )
            db.add(user_sourav)
            db.flush()

            sourav = Profile(
                user_id=user_sourav.id,
                first_name="Sourav",
                last_name="Ghosh",
                gender="MALE",
                date_of_birth=date(1996, 7, 18),
                height_cm=175,
                marital_status="NEVER_MARRIED",
                mother_tongue="Bengali",
                community="Sadgope",
                sub_community="Kulin Sadgope",
                native_place="Bankura",
                current_state="Karnataka",
                current_city="Bengaluru",
                highest_qualification="M.S. in Data Science",
                occupation="Data Scientist",
                company_name="Tech Unicorn",
                annual_income="20-30 Lakhs INR",
                diet="NON_VEGETARIAN",
                about_me="Data Scientist in Bengaluru, simple and family-oriented. Enjoys travel, books, and music.",
                profile_completion_pct=92,
            )
            db.add(sourav)
            db.flush()

            db.add(ProfilePrivacy(
                profile_id=sourav.id,
                phone_visibility="PREMIUM_ONLY",
                email_visibility="PRIVATE",
            ))
            existing_sourav = sourav

        db.commit()

        # 2. Seed Interests if empty
        if db.query(Interest).count() == 0 and subham and existing_debjit and existing_sourav:
            # Subham -> Priyanka (Received by Priyanka)
            db.add(Interest(
                sender_profile_id=subham.id,
                receiver_profile_id=priyanka.id,
                status="SENT",
                sent_at=datetime.now(timezone.utc),
            ))

            # Priyanka -> Sourav (Sent by Priyanka)
            db.add(Interest(
                sender_profile_id=priyanka.id,
                receiver_profile_id=existing_sourav.id,
                status="SENT",
                sent_at=datetime.now(timezone.utc),
            ))

            # Debjit <-> Priyanka (Accepted)
            db.add(Interest(
                sender_profile_id=existing_debjit.id,
                receiver_profile_id=priyanka.id,
                status="ACCEPTED",
                sent_at=datetime.now(timezone.utc),
                responded_at=datetime.now(timezone.utc),
            ))
            db.commit()

        # 3. Seed Shortlist if empty
        if db.query(Shortlist).count() == 0 and existing_debjit:
            db.add(Shortlist(
                user_profile_id=priyanka.id,
                target_profile_id=existing_debjit.id,
                created_at=datetime.now(timezone.utc),
            ))
            db.commit()

        # 4. Seed Conversation if empty
        if db.query(Conversation).count() == 0 and existing_debjit:
            conv = Conversation()
            db.add(conv)
            db.flush()

            db.add(ConversationMember(conversation_id=conv.id, profile_id=priyanka.id))
            db.add(ConversationMember(conversation_id=conv.id, profile_id=existing_debjit.id))

            db.add(Message(
                conversation_id=conv.id,
                sender_profile_id=existing_debjit.id,
                content="Namaste Priyanka-ji, our family came across your profile on BorKonya and we felt our family values and community heritage align wonderfully.",
                is_read=True,
                read_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
            ))
            db.add(Message(
                conversation_id=conv.id,
                sender_profile_id=priyanka.id,
                content="Namaste Debjit! Thank you for connecting. My parents also reviewed your details and were very pleased. We would love to discuss further.",
                is_read=True,
                read_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc),
            ))
            db.commit()

        print("Phase 4 seed completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"Error seeding interactions: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_interactions_and_more_profiles()
