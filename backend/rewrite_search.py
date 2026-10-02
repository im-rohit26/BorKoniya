import re

with open("d:/BorKonya/backend/app/api/v1/endpoints/search.py", "r", encoding="utf-8") as f:
    content = f.read()

# Imports
content = content.replace(
    "from app.models.entities import Profile, User, SavedSearch, BlockedUser",
    "from app.models.entities import Profile, User, SavedSearch, BlockedUser, MatchScore\nfrom sqlalchemy import or_, and_"
)
content = content.replace(
    "from app.services.matching_service import matching_service",
    "from app.services.matching_service import matching_service, get_match_score"
)

# N+1 and Age filtering
search_setup_old = """    query = db.query(Profile).filter(Profile.status == "ACTIVE")"""
search_setup_new = """    query = db.query(Profile, User).join(User, Profile.user_id == User.id).filter(Profile.status == "ACTIVE")
    
    today = date.today()
    if age_min:
        try:
            min_date = date(today.year - age_min, today.month, today.day)
        except ValueError:
            min_date = date(today.year - age_min, 3, 1) if today.month == 2 and today.day == 29 else date(today.year - age_min, today.month, today.day)
        query = query.filter(Profile.date_of_birth <= min_date)
    if age_max:
        try:
            max_date = date(today.year - age_max - 1, today.month, today.day)
        except ValueError:
            max_date = date(today.year - age_max - 1, 3, 1) if today.month == 2 and today.day == 29 else date(today.year - age_max - 1, today.month, today.day)
        query = query.filter(Profile.date_of_birth > max_date)"""

content = content.replace(search_setup_old, search_setup_new, 1)

# Sorting
sort_old = """    profiles = query.limit(50).all()
    results = []

    today = date.today()
    ref_profile = my_profile if my_profile else (profiles[0] if profiles else None)"""

sort_new = """    if sort_by == "newest":
        query = query.order_by(Profile.id.desc())
    elif sort_by == "age_asc":
        query = query.order_by(Profile.date_of_birth.desc())
    elif sort_by == "age_desc":
        query = query.order_by(Profile.date_of_birth.asc())
    else:
        if my_profile:
            query = query.outerjoin(
                MatchScore,
                or_(
                    and_(MatchScore.profile_a_id == my_profile.id, MatchScore.profile_b_id == Profile.id),
                    and_(MatchScore.profile_b_id == my_profile.id, MatchScore.profile_a_id == Profile.id)
                )
            ).order_by(MatchScore.score.desc().nulls_last())

    profiles_users = query.limit(50).all()
    results = []

    today = date.today()
    ref_profile = my_profile if my_profile else (profiles_users[0][0] if profiles_users else None)"""

content = content.replace(sort_old, sort_new, 1)

# Loop and memory sort removal
loop_old = """    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)

        # Calculate actual age
        calculated_age = today.year - p.date_of_birth.year - (
            (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
        )
        res.age = calculated_age

        # Filter by age range in memory
        if age_min and calculated_age < age_min:
            continue
        if age_max and calculated_age > age_max:
            continue

        if ref_profile and p.id != ref_profile.id:
            score, breakdown = matching_service.evaluate_match(ref_profile, p)
            res.match_score = score
            res.match_breakdown = breakdown
        else:
            res.match_score = 94
            res.match_breakdown = [
                f"Community aligns: {p.community}",
                f"Location preference: {p.current_state}",
                "Age compatibility verified",
            ]

        results.append(res)

    # Sorting
    if sort_by == "newest":
        results = sorted(results, key=lambda x: x.id, reverse=True)
    elif sort_by == "age_asc":
        results = sorted(results, key=lambda x: x.age)
    elif sort_by == "age_desc":
        results = sorted(results, key=lambda x: x.age, reverse=True)
    else:  # match_score default
        results = sorted(results, key=lambda x: x.match_score or 0, reverse=True)

    return results[:limit]"""

loop_new = """    for p, user in profiles_users:
        res = format_profile_response(p, user=user)

        # Calculate actual age
        calculated_age = today.year - p.date_of_birth.year - (
            (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
        )
        res.age = calculated_age

        if ref_profile and p.id != ref_profile.id:
            db_score = get_match_score(db, ref_profile.id, p.id)
            if db_score is not None:
                res.match_score = db_score
                _, res.match_breakdown = matching_service.evaluate_match(ref_profile, p)
            else:
                score, breakdown = matching_service.evaluate_match(ref_profile, p)
                res.match_score = score
                res.match_breakdown = breakdown
        else:
            res.match_score = 0
            res.match_breakdown = []

        results.append(res)

    return results[:limit]"""

content = content.replace(loop_old, loop_new, 1)


with open("d:/BorKonya/backend/app/api/v1/endpoints/search.py", "w", encoding="utf-8") as f:
    f.write(content)
