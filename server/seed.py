"""Port of Laravel's DatabaseSeeder.

Creates the schema (if missing) and a test user with three practice sessions,
each containing 1000 solves whose times trend downward over two years.

Usage:
    python seed.py          # seeds on top of the current database
    python seed.py --fresh  # drops & recreates the three app tables first
"""

import random
import sys
from datetime import datetime, timedelta, timezone

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import PracticeSession, Solve, User

MOVES = ["R", "L", "U", "D", "F", "B"]
MODIFIERS = ["", "'", "2"]

CUBE_CONFIGS = [
    {"name": "3x3 Practice", "cube": "undefined", "initial_time": 30000, "final_time": 10000, "scramble_length": 20},
    {"name": "2x2 Practice", "cube": "undefined", "initial_time": 5000, "final_time": 2000, "scramble_length": 10},
    {"name": "5x5 Practice", "cube": "undefined", "initial_time": 120000, "final_time": 60000, "scramble_length": 60},
]


def _utcnow_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _random_scramble(length: int) -> str:
    return " ".join(
        random.choice(MOVES) + random.choice(MODIFIERS) for _ in range(length)
    )


def _make_solves(session_id: int, config: dict) -> list[Solve]:
    num_solves = 1000
    now = _utcnow_naive()

    timestamps = []
    for _ in range(num_solves):
        delta = timedelta(
            days=random.randint(0, 730),
            hours=random.randint(0, 23),
            minutes=random.randint(0, 59),
        )
        timestamps.append(now - delta)
    timestamps.sort()

    solves = []
    for index, solved_at in enumerate(timestamps):
        progress = index / (num_solves - 1)
        base_time = config["initial_time"] - (
            config["initial_time"] - config["final_time"]
        ) * progress
        variation = base_time * 0.2
        time = base_time + random.uniform(-variation, variation)
        time = max(1000, int(time))

        solves.append(
            Solve(
                session_id=session_id,
                time=time,
                scramble=_random_scramble(config["scramble_length"]),
                penalty="OK",
                solved_at=solved_at,
                created_at=now,
                updated_at=now,
            )
        )
    return solves


def seed(fresh: bool = False) -> None:
    if fresh:
        for table in (Solve.__table__, PracticeSession.__table__, User.__table__):
            table.drop(engine, checkfirst=True)
    Base.metadata.create_all(engine)

    now = _utcnow_naive()
    db = SessionLocal()
    try:
        user = User(
            name="Test User",
            email="test@test",
            password=hash_password("qwerty"),
            created_at=now,
            updated_at=now,
        )
        db.add(user)
        db.flush()

        for config in CUBE_CONFIGS:
            session = PracticeSession(
                user_id=user.id,
                name=config["name"],
                cube=config["cube"],
                created_at=now,
                updated_at=now,
            )
            db.add(session)
            db.flush()
            db.add_all(_make_solves(session.id, config))

        db.commit()
        print(f"Seeded user {user.email!r} with {len(CUBE_CONFIGS)} sessions.")
    finally:
        db.close()


if __name__ == "__main__":
    seed(fresh="--fresh" in sys.argv)
