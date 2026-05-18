# Gym Management System

A full-stack web application for managing gym operations including members, subscriptions, equipment, appointments, workouts, and nutrition plans.

## Tech Stack

**Backend:** FastAPI, SQLAlchemy, SQLite, Alembic, JWT Auth
**Frontend:** React.js, Axios, Vite

## Project Structure

```
gym/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── database.py
│   │   ├── config.py
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── crud/            # CRUD operations
│   │   ├── routes/          # API endpoints
│   │   ├── services/        # Business logic
│   │   └── auth/            # JWT authentication
│   ├── alembic/             # Database migrations
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios API layer
│   │   ├── pages/           # Page components
│   │   ├── layouts/         # Layout components
│   │   ├── routes/          # React Router config
│   │   └── App.jsx          # Root component
│   ├── package.json
│   └── index.html
└── README.md
```

## Setup & Run

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
# source venv/bin/activate  # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API runs at http://localhost:8000

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:3000

### Default Login

- **Username:** admin
- **Password:** admin123

## API Endpoints

| Module | Endpoints |
|--------|-----------|
| Auth | POST /api/auth/login, POST /api/auth/register |
| Members | GET/POST/PUT/DELETE /api/members |
| Plans | GET/POST/PUT/DELETE /api/plans |
| Subscriptions | GET/POST/PUT/DELETE /api/subscriptions |
| Offers | GET/POST/PUT/DELETE /api/offers |
| Equipment | GET/POST/PUT/DELETE /api/equipment |
| Staff | GET/POST/PUT/DELETE /api/staff |
| Appointments | GET/POST/PUT/DELETE /api/appointments |
| Workouts | GET/POST /api/workouts/types, /api/workouts/exercises, /api/workouts/plans |
| Nutrition | GET/POST/PUT/DELETE /api/nutrition/plans |
| Dashboard | GET /api/dashboard |

## Features

- Member management with status tracking
- Membership plans (monthly, quarterly, yearly)
- Subscription management with payment tracking
- Offers & discounts engine
- Gym equipment inventory & maintenance tracking
- Staff & trainer management
- Appointment scheduling
- Workout types, exercises & member workout plans
- Nutrition plans with macro tracking
- Dashboard with key metrics
