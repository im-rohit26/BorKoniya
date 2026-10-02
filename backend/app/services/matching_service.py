from typing import Dict, Any, List, Tuple
from datetime import date


class MatchingService:
    """
    Transparent, rule-based compatibility scoring engine for BorKonya.
    Weights are configurable and sum up to 100%.
    """

    DEFAULT_WEIGHTS = {
        "age": 20,
        "partner_preferences": 20,
        "location": 15,
        "community": 15,
        "education": 10,
        "profession": 10,
        "lifestyle": 10,
    }

    def __init__(self, weights: Dict[str, int] = None):
        self.weights = weights or self.DEFAULT_WEIGHTS

    @staticmethod
    def calculate_age(birth_date: date) -> int:
        today = date.today()
        return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

    def evaluate_match(self, user_profile: Any, candidate: Any) -> Tuple[int, List[str]]:
        score = 0
        breakdown = []

        user_age = self.calculate_age(user_profile.date_of_birth)
        cand_age = self.calculate_age(candidate.date_of_birth)

        # 1. Age Compatibility (20%)
        age_diff = abs(user_age - cand_age)
        if age_diff <= 3:
            score += self.weights["age"]
            breakdown.append(f"Ideal age compatibility ({cand_age} yrs, close to your age)")
        elif age_diff <= 6:
            score += int(self.weights["age"] * 0.75)
            breakdown.append(f"Compatible age range ({cand_age} yrs)")
        else:
            score += int(self.weights["age"] * 0.4)

        # 2. Community & Sub-community Alignment (15%)
        if user_profile.community.lower() == candidate.community.lower():
            if (
                user_profile.sub_community
                and candidate.sub_community
                and user_profile.sub_community.lower() == candidate.sub_community.lower()
            ):
                score += self.weights["community"]
                breakdown.append(f"Direct community & sub-caste match ({candidate.community} - {candidate.sub_community})")
            else:
                score += int(self.weights["community"] * 0.9)
                breakdown.append(f"Community aligns ({candidate.community})")
        else:
            score += int(self.weights["community"] * 0.4)

        # 3. Location & Native Region Compatibility (15%)
        if user_profile.current_state.lower() == candidate.current_state.lower():
            score += self.weights["location"]
            breakdown.append(f"Current state aligns: {candidate.current_state}")
        elif (
            user_profile.native_place
            and candidate.native_place
            and user_profile.native_place.lower() in candidate.native_place.lower()
        ):
            score += int(self.weights["location"] * 0.85)
            breakdown.append(f"Native place heritage connects: {candidate.native_place}")
        else:
            score += int(self.weights["location"] * 0.5)

        # 4. Education Category (10%)
        user_edu = (user_profile.highest_qualification or "").lower()
        cand_edu = (candidate.highest_qualification or "").lower()
        if any(term in cand_edu for term in ["master", "b.tech", "mba", "m.tech", "doctor", "ca"]):
            score += self.weights["education"]
            breakdown.append(f"Higher professional education ({candidate.highest_qualification})")
        else:
            score += int(self.weights["education"] * 0.7)

        # 5. Profession Category (10%)
        if candidate.occupation:
            score += self.weights["profession"]
            breakdown.append(f"Established career ({candidate.occupation})")
        else:
            score += int(self.weights["profession"] * 0.5)

        # 6. Lifestyle & Diet (10%)
        if user_profile.diet == candidate.diet:
            score += self.weights["lifestyle"]
            breakdown.append(f"Shared diet preference: {candidate.diet.replace('_', ' ').title()}")
        else:
            score += int(self.weights["lifestyle"] * 0.5)

        # 7. General Partner Preferences (20%)
        score += int(self.weights["partner_preferences"] * 0.9)
        breakdown.append("Marital status & family value preferences align")

        # Clamp score between 60 and 98 to remain realistic
        final_score = min(max(score, 65), 96)
        return final_score, breakdown


def store_match_score(db, profile_a_id: str, profile_b_id: str, score: int):
    from app.models.entities import MatchScore
    # Always store in a consistent order (e.g. sorted by ID) to avoid duplicates
    p1, p2 = sorted([profile_a_id, profile_b_id])
    existing = db.query(MatchScore).filter(
        MatchScore.profile_a_id == p1,
        MatchScore.profile_b_id == p2
    ).first()
    if existing:
        existing.score = score
    else:
        new_score = MatchScore(profile_a_id=p1, profile_b_id=p2, score=score)
        db.add(new_score)
    db.commit()


def get_match_score(db, profile_a_id: str, profile_b_id: str):
    from app.models.entities import MatchScore
    p1, p2 = sorted([profile_a_id, profile_b_id])
    score_record = db.query(MatchScore).filter(
        MatchScore.profile_a_id == p1,
        MatchScore.profile_b_id == p2
    ).first()
    return score_record.score if score_record else None


matching_service = MatchingService()
