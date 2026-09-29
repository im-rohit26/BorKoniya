from fastapi import APIRouter

router = APIRouter(prefix="/master", tags=["Configurable Master Data"])


@router.get("/communities")
def get_communities():
    return [
        {
            "id": 1,
            "name": "Sadgope",
            "sub_communities": ["Kulin Sadgope", "Ghosh", "Pal", "Sarkar", "Mollik"],
        },
        {
            "id": 2,
            "name": "Gowala / Goala",
            "sub_communities": ["Ahir", "Gope", "Gowala General"],
        },
    ]


@router.get("/locations")
def get_locations():
    return {
        "priority_states": [
            "West Bengal",
            "Odisha",
            "Jharkhand",
            "Bihar",
            "Chhattisgarh",
            "Maharashtra",
            "Gujarat",
            "Delhi / NCR",
        ],
        "native_belts": [
            "Bardhaman",
            "Medinipur",
            "Bankura",
            "Birbhum",
            "Hooghly",
            "Balasore",
            "Cuttack",
            "Ranchi",
            "Dhanbad",
            "Patna",
            "Gaya",
        ],
    }
