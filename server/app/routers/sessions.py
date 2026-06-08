from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session as DBSession

from ..auth import get_current_user
from ..database import get_db
from ..models import PracticeSession, User
from ..schemas import SessionCreateIn, SessionUpdateIn

router = APIRouter(prefix="/sessions")


def _get_owned_session(
    session_id: int, db: DBSession, user: User
) -> PracticeSession:
    session = db.get(PracticeSession, session_id)
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail={"message": "Not found"}
        )
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail={"error": "Unauthorized"}
        )
    return session


@router.get("")
def index(
    current_user: User = Depends(get_current_user), db: DBSession = Depends(get_db)
):
    sessions = db.scalars(
        select(PracticeSession)
        .where(PracticeSession.user_id == current_user.id)
        .order_by(PracticeSession.created_at.desc())
    ).all()
    return [s.to_dict(include_solves=True) for s in sessions]


@router.post("", status_code=status.HTTP_201_CREATED)
def store(
    payload: SessionCreateIn,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    session = PracticeSession(
        user_id=current_user.id, name=payload.name, cube=payload.cube
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session.to_dict(include_solves=True)


@router.put("/{session_id}")
def update(
    session_id: int,
    payload: SessionUpdateIn,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    session = _get_owned_session(session_id, db, current_user)
    session.name = payload.name
    db.commit()
    db.refresh(session)
    return session.to_dict()


@router.delete("/{session_id}")
def destroy(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    session = _get_owned_session(session_id, db, current_user)
    db.delete(session)
    db.commit()
    return {"message": "Session deleted"}
