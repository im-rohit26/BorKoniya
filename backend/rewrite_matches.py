import re

with open("d:/BorKonya/backend/app/api/v1/endpoints/matches.py", "r", encoding="utf-8") as f:
    content = f.read()

# Add imports
content = content.replace(
    "from app.models.entities import Profile, User, BlockedUser",
    "from app.models.entities import Profile, User, BlockedUser, MatchScore\nfrom sqlalchemy import or_, and_"
)
content = content.replace(
    "from app.services.matching_service import matching_service",
    "from app.services.matching_service import matching_service, get_match_score"
)

# Fix sorting and joining in /recommended
rec_query = """    query = db.query(Profile).filter(Profile.status == "ACTIVE")
    if blocked_ids:
        query = query.filter(~Profile.id.in_(blocked_ids))"""
rec_query_new = """    query = db.query(Profile).filter(Profile.status == "ACTIVE")
    if blocked_ids:
        query = query.filter(~Profile.id.in_(blocked_ids))

    if my_profile:
        query = query.outerjoin(
            MatchScore,
            or_(
                and_(MatchScore.profile_a_id == my_profile.id, MatchScore.profile_b_id == Profile.id),
                and_(MatchScore.profile_b_id == my_profile.id, MatchScore.profile_a_id == Profile.id)
            )
        ).order_by(MatchScore.score.desc().nulls_last())"""

content = content.replace(rec_query, rec_query_new, 1)

# Fix hardcoded scores in /recommended
rec_loop = """        if ref_profile and p.id != ref_profile.id:
            score, breakdown = matching_service.evaluate_match(ref_profile, p)
            res.match_score = score
            res.match_breakdown = breakdown
        else:
            res.match_score = 96
            res.match_breakdown = [
                "Direct Sadgope / Gowala community match",
                "High cultural and family alignment",
                "Verified background details",
                "Preferred regional belt",
            ]

        results.append(res)

    sorted_results = sorted(results, key=lambda x: x.match_score or 0, reverse=True)
    return sorted_results[:limit]"""

rec_loop_new = """        if ref_profile and p.id != ref_profile.id:
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
content = content.replace(rec_loop, rec_loop_new, 1)


# For /new
new_loop = """    results = []
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
        res.match_score = 90
        res.match_breakdown = [
            "Recently registered member",
            f"Active in {p.current_city}, {p.current_state}",
            f"Community: {p.community}",
        ]
        results.append(res)
    return results[:limit]"""

new_loop_new = """    results = []
    ref_profile = my_profile
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
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

content = content.replace(new_loop, new_loop_new, 1)


# For /near-you
# Use exact match `== state` on `Profile.current_state` instead of `ilike`.
near_you_query = """.filter(Profile.current_state.ilike(f"%{state}%"))"""
near_you_query_new = """.filter(Profile.current_state == state)"""
content = content.replace(near_you_query, near_you_query_new, 1)

near_you_loop = """    results = []
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
        res.match_score = 92
        res.match_breakdown = [
            f"Living in nearby region: {p.current_city}, {p.current_state}",
            "Regional community belt",
        ]
        results.append(res)
    return results[:limit]"""

content = content.replace(near_you_loop, new_loop_new, 1) # same replacement logic

# For /visitors
visitors_loop = """    results = []
    for p in profiles:
        user = db.query(User).filter(User.id == p.user_id).first()
        res = format_profile_response(p, user=user)
        res.match_score = 88
        res.match_breakdown = [
            "Viewed your profile in the past 48 hours",
            f"Community: {p.community}",
            f"Education: {p.highest_qualification}",
        ]
        results.append(res)
    return results[:limit]"""

content = content.replace(visitors_loop, new_loop_new, 1) # same logic

with open("d:/BorKonya/backend/app/api/v1/endpoints/matches.py", "w", encoding="utf-8") as f:
    f.write(content)
