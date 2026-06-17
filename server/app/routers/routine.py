import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from ..auth import get_current_user
from ..database import get_db
from ..models import DailyLog, Routine, User
from ..schemas import DailyLogIn, RoutineUpdateIn

router = APIRouter()


def _utcnow_naive() -> datetime:
    # Store a naive UTC timestamp to match the existing column format.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _get_or_create_routine(db: DBSession, user: User) -> Routine:
    routine = db.scalar(select(Routine).where(Routine.user_id == user.id))
    if routine is None:
        now = _utcnow_naive()
        routine = Routine(
            user_id=user.id, tasks=json.dumps([]), created_at=now, updated_at=now
        )
        db.add(routine)
        db.commit()
        db.refresh(routine)
    return routine


@router.get("/routine")
def get_routine(
    current_user: User = Depends(get_current_user), db: DBSession = Depends(get_db)
):
    return _get_or_create_routine(db, current_user).to_dict()


@router.put("/routine")
def update_routine(
    payload: RoutineUpdateIn,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    routine = _get_or_create_routine(db, current_user)
    routine.tasks = json.dumps([t.model_dump() for t in payload.tasks])
    routine.updated_at = _utcnow_naive()
    db.commit()
    db.refresh(routine)
    return routine.to_dict()


@router.get("/daily-logs")
def index_daily_logs(
    current_user: User = Depends(get_current_user), db: DBSession = Depends(get_db)
):
    logs = db.scalars(
        select(DailyLog)
        .where(DailyLog.user_id == current_user.id)
        .order_by(DailyLog.date.desc())
    ).all()
    return [log.to_dict() for log in logs]


@router.put("/daily-logs/{date}")
def upsert_daily_log(
    date: str,
    payload: DailyLogIn,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    log = db.scalar(
        select(DailyLog).where(
            DailyLog.user_id == current_user.id, DailyLog.date == date
        )
    )
    entries_json = json.dumps(
        {tid: entry.model_dump() for tid, entry in payload.entries.items()}
    )
    now = _utcnow_naive()
    if log is None:
        log = DailyLog(
            user_id=current_user.id,
            date=date,
            notes=payload.notes,
            rating=payload.rating,
            entries=entries_json,
            created_at=now,
            updated_at=now,
        )
        db.add(log)
    else:
        log.notes = payload.notes
        log.rating = payload.rating
        log.entries = entries_json
        log.updated_at = now
    db.commit()
    db.refresh(log)
    return log.to_dict()
