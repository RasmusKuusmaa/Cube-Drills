# Cube Drills

A Rubik's cube practice timer. Vue 3 frontend + FastAPI backend (SQLite).

## Running the backend
```bash
cd server
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate    # macOS / Linux
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API serves on http://localhost:8000 (routes under `/api`, docs at `/docs`).
See [server/README.md](server/README.md) for configuration and endpoints.

## Running the frontend
```bash
cd client
npm install
npm run dev
```

- Backend: http://localhost:8000
- Frontend: http://localhost:5173

## Running the full stack with Docker
```bash
docker-compose up --build
```
