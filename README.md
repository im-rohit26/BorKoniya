# BorKonya — Community Matrimonial Platform

> **Parampara Se Rishton Tak.**  
> Dedicated matrimonial web application honoring the traditions and modern aspirations of the **Sadgope, Gowala, and Goala** communities across West Bengal, Odisha, Jharkhand, Bihar, Chhattisgarh, Maharashtra, Gujarat, Delhi/NCR, and the global diaspora.

---

## Architecture & Technology Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + `react-i18next` (English, हिन्दी, ଓଡ଼ିଆ, বাংলা)
- **Backend:** FastAPI (Python 3.11+) + Pydantic v2 + SQLAlchemy 2.0 + PostgreSQL / Supabase
- **Data & Media:** Supabase Database (RLS) + Supabase Storage buckets
- **Matching Engine:** Explainable 100% weighted rule-based compatibility scoring (`Why this match?`)
- **Subscription Engine:** ₹200/month plan, 50% discount coupon (`BOR50` -> ₹100 net), payment service abstraction
- **Security & Privacy:** Contact masking (phone & email hidden by default), OTP verification, block & report moderation

---

## Project Structure

```
BorKonya/
├── frontend/                   # React + Vite + TypeScript application
│   ├── src/
│   │   ├── components/         # UI Primitives, Cards, Navigation, Modals
│   │   ├── locales/            # en, hi, or, bn JSON translations
│   │   ├── pages/              # Landing, Search, ProfileDetail, Dashboard, Subscription
│   │   ├── data/               # Realistic community mock profiles
│   │   └── i18n/               # i18next configuration & language detector
│   ├── package.json
│   └── vite.config.ts
├── backend/                    # FastAPI modular REST API
│   ├── app/
│   │   ├── api/v1/             # Auth, Profiles, Matches, Search, Subscriptions, Master Data
│   │   ├── core/               # Database, Security (Bcrypt/JWT), Config
│   │   ├── models/             # SQLAlchemy ORM entities
│   │   ├── schemas/            # Pydantic v2 request/response models
│   │   └── services/           # Matching engine, Subscription/Coupon, Auth
│   ├── tests/                  # Pytest test suite
│   ├── requirements.txt
│   ├── .env.example
│   └── main.py
└── database/
    └── init_schema.sql         # Complete Supabase PostgreSQL DDL and seeds
```

---

## Quickstart Guide

### 1. Backend Setup & Run

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run the test suite
python -m pytest tests/test_api.py -v

# Start FastAPI development server
python -m uvicorn main:app --reload --port 8000
```
- Interactive API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 2. Frontend Setup & Run

```bash
cd frontend

# Install dependencies
npm install

# Build verification
npm run build

# Start Vite dev server
npm run dev
```
- Web Application: `http://localhost:5173`

---

## Key Features

1. **4-Language Cultural Localization:**
   - First-screen language selection modal (`English`, `हिन्दी`, `ଓଡ଼ିଆ`, `বাংলা`)
   - Persistent language selection with real-time reactive switching.
2. **Community-Tailored Search:**
   - Pre-configured Sadgope (Kulin, Ghosh, Pal, Sarkar, Mollik) and Gowala (Ahir, Gope) sub-communities.
   - Regional location filters covering native districts (Bardhaman, Medinipur, Balasore, Ranchi, etc.).
3. **Safety & Privacy Controls:**
   - Contact numbers and emails are masked by default.
   - Mobile and email verified badges with 6-digit OTP verification simulation.
4. **Subscription & Coupon System:**
   - Monthly Premium plan at ₹200/month.
   - Community coupon `BOR50` applies 50% discount yielding ₹100 net payable.
