# Cube Drills API (FastAPI)

FastAPI backend for Cube Drills. This replaces the original Laravel `cd-server`
while keeping the exact same HTTP API contract, JWT auth, and SQLite database, so
the Vue client needs no changes.

## Stack

- **FastAPI** + **Uvicorn**
- **SQLAlchemy 2.0** (ORM)
- **PyJWT** (HS256 bearer tokens, same `JWT_SECRET` as Laravel)
- **bcrypt** (verifies the existing Laravel `$2y$` password hashes)
- **SQLite** (`database.sqlite`, copied from the Laravel app with all seeded data)

## Run locally

```bash
cd server
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API serves on `http://localhost:8000`, with all routes under `/api`
(matching the client's `baseURL`). Interactive docs: `http://localhost:8000/docs`.

## Seeding

The shipped `database.sqlite` already contains the seeded test data
(`test@test` / `qwerty`, 3 sessions, 3000 solves). To regenerate from scratch:

```bash
python seed.py --fresh
```

## Endpoints

| Method | Path                            | Auth | Description            |
|--------|---------------------------------|------|------------------------|
| POST   | `/api/register`                 | no   | Register, returns token|
| POST   | `/api/login`                    | no   | Login, returns token   |
| GET    | `/api/me`                       | yes  | Current user           |
| GET    | `/api/sessions`                 | yes  | List sessions + solves |
| POST   | `/api/sessions`                 | yes  | Create session         |
| PUT    | `/api/sessions/{id}`            | yes  | Rename session         |
| DELETE | `/api/sessions/{id}`            | yes  | Delete session         |
| POST   | `/api/sessions/{id}/solves`     | yes  | Add a solve            |
| PATCH  | `/api/solves/{id}`              | yes  | Update solve penalty   |

## Configuration

See `.env` (`.env.example` for the template). Key settings: `DATABASE_URL`,
`JWT_SECRET`, `JWT_TTL_MINUTES`, `BCRYPT_ROUNDS`, `CORS_ORIGINS`.
