import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from ..auth import get_current_user
from ..database import get_db
from ..models import PracticeSession, Solve, User
from ..schemas import SolveCreateIn, SolveUpdateIn

router = APIRouter()


def _utcnow_naive() -> datetime:
    # Store a naive UTC timestamp to match the existing column format.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _authorize_session(session: PracticeSession | None, user: User) -> PracticeSession:
    if session is None or session.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    return session


@router.post("/sessions/{session_id}/solves", status_code=status.HTTP_201_CREATED)
def store(
    session_id: int,
    payload: SolveCreateIn,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    session = _authorize_session(db.get(PracticeSession, session_id), current_user)

    solve = Solve(
        session_id=session.id,
        time=payload.time,
        scramble=payload.scramble,
        penalty=payload.penalty or "OK",
        phases=json.dumps(payload.phases) if payload.phases else None,
        inspection_ms=payload.inspectionMs,
        solved_at=_utcnow_naive(),
    )
    db.add(solve)
    db.commit()
    db.refresh(solve)
    return solve.to_dict()


@router.patch("/solves/{solve_id}")
def update(
    solve_id: int,
    payload: SolveUpdateIn,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    solve = db.get(Solve, solve_id)
    if solve is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    _authorize_session(solve.session, current_user)

    fields = payload.model_fields_set
    if "penalty" in fields and payload.penalty is not None:
        solve.penalty = payload.penalty
    if "comment" in fields:
        solve.comment = payload.comment

    db.commit()
    db.refresh(solve)
    return solve.to_dict()


@router.delete("/solves/{solve_id}")
def destroy(
    solve_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    solve = db.get(Solve, solve_id)
    if solve is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    _authorize_session(solve.session, current_user)

    db.delete(solve)
    db.commit()
    return {"message": "Solve deleted"}
