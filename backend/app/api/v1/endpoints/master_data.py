from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import Community, SubCommunity

router = APIRouter(tags=["Master Data"])

@router.get("/communities")
def get_communities(db: Session = Depends(get_db)):
    communities = db.query(Community).filter(Community.is_active == True).all()
    return [{"id": c.id, "name": c.name} for c in communities]

@router.get("/sub-communities")
def get_sub_communities(community_id: int = None, db: Session = Depends(get_db)):
    q = db.query(SubCommunity).filter(SubCommunity.is_active == True)
    if community_id:
        q = q.filter(SubCommunity.community_id == community_id)
    subs = q.all()
    return [{"id": s.id, "community_id": s.community_id, "name": s.name} for s in subs]

# The following are config-driven master data (stable lists that rarely change)
# These are served from code config but can be moved to DB if admin editability is needed

HEIGHT_OPTIONS = [str(h) for h in range(140, 221)]  # 140cm to 220cm

MARITAL_STATUSES = [
    {"value": "NEVER_MARRIED", "label": "Never Married"},
    {"value": "DIVORCED", "label": "Divorced"},
    {"value": "WIDOWED", "label": "Widowed"},
    {"value": "AWAITING_DIVORCE", "label": "Awaiting Divorce"},
]

DIET_OPTIONS = [
    {"value": "VEGETARIAN", "label": "Vegetarian"},
    {"value": "NON_VEGETARIAN", "label": "Non-Vegetarian"},
    {"value": "EGGETARIAN", "label": "Eggetarian"},
    {"value": "VEGAN", "label": "Vegan"},
    {"value": "JAIN", "label": "Jain"},
]

EDUCATION_LEVELS = [
    {"value": "HIGH_SCHOOL", "label": "High School / 10th"},
    {"value": "INTERMEDIATE", "label": "Intermediate / 12th"},
    {"value": "DIPLOMA", "label": "Diploma"},
    {"value": "BACHELORS", "label": "Bachelor's Degree"},
    {"value": "MASTERS", "label": "Master's Degree"},
    {"value": "MBA", "label": "MBA"},
    {"value": "MBBS", "label": "MBBS / Medical"},
    {"value": "PHD", "label": "Ph.D / Doctorate"},
    {"value": "OTHER", "label": "Other"},
]

PROFESSIONS = [
    {"value": "PRIVATE_SECTOR", "label": "Private Sector"},
    {"value": "GOVERNMENT", "label": "Government / PSU"},
    {"value": "SELF_EMPLOYED", "label": "Self-Employed / Business"},
    {"value": "DOCTOR", "label": "Doctor"},
    {"value": "ENGINEER", "label": "Engineer"},
    {"value": "TEACHER", "label": "Teacher / Professor"},
    {"value": "LAWYER", "label": "Lawyer"},
    {"value": "ACCOUNTANT", "label": "Accountant / CA"},
    {"value": "DEFENCE", "label": "Defence / Armed Forces"},
    {"value": "NOT_WORKING", "label": "Not Working"},
    {"value": "STUDENT", "label": "Student"},
    {"value": "OTHER", "label": "Other"},
]

INCOME_RANGES = [
    {"value": "BELOW_2L", "label": "Below ₹2 Lakhs"},
    {"value": "2L_5L", "label": "₹2 – 5 Lakhs"},
    {"value": "5L_10L", "label": "₹5 – 10 Lakhs"},
    {"value": "10L_20L", "label": "₹10 – 20 Lakhs"},
    {"value": "20L_50L", "label": "₹20 – 50 Lakhs"},
    {"value": "ABOVE_50L", "label": "Above ₹50 Lakhs"},
]

INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
    "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Delhi", "Jammu & Kashmir", "Ladakh",
]

ICEBREAKERS = [
    "নমস্কার! আপনার প্রোফাইল দেখে ভালো লাগলো।",
    "আপনার পরিচয় জানতে চাই।",
    "আশা করি আপনি ভালো আছেন!",
    "আপনার সম্পর্কে আরো জানতে আগ্রহী।",
    "Hello! Would love to know more about you.",
]

PROFILE_FOR_OPTIONS = [
    {"value": "MYSELF", "label": "Myself"},
    {"value": "SON", "label": "Son"},
    {"value": "DAUGHTER", "label": "Daughter"},
    {"value": "BROTHER", "label": "Brother"},
    {"value": "SISTER", "label": "Sister"},
    {"value": "RELATIVE", "label": "Relative / Friend"},
]

MOTHER_TONGUE_OPTIONS = [
    "Bengali", "Hindi", "English", "Assamese", "Odia", "Maithili", "Santali",
]

@router.get("/marital-statuses")
def get_marital_statuses():
    return MARITAL_STATUSES

@router.get("/diet-options")
def get_diet_options():
    return DIET_OPTIONS

@router.get("/education-levels")
def get_education_levels():
    return EDUCATION_LEVELS

@router.get("/professions")
def get_professions():
    return PROFESSIONS

@router.get("/income-ranges")
def get_income_ranges():
    return INCOME_RANGES

@router.get("/states")
def get_states():
    return [{"value": s, "label": s} for s in INDIAN_STATES]

@router.get("/height-options")
def get_height_options():
    return [{"value": str(h), "label": f"{h} cm"} for h in range(140, 221)]

@router.get("/icebreakers")
def get_icebreakers():
    return ICEBREAKERS

@router.get("/profile-for-options")
def get_profile_for_options():
    return PROFILE_FOR_OPTIONS

@router.get("/mother-tongue-options")
def get_mother_tongue_options():
    return MOTHER_TONGUE_OPTIONS
