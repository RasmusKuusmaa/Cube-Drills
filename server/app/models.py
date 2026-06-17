from __future__ import annotations

import json
from datetime import datetime

from sqlalchemy import ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def _laravel_datetime(value: datetime | None) -> str | None:
    """Match Laravel's default model serialization, e.g. 2024-04-08T02:20:39.000000Z."""
    if value is None:
        return None
    return value.strftime("%Y-%m-%dT%H:%M:%S.%f") + "Z"


def _iso8601(value: datetime | None) -> str | None:
    """Match Carbon's toIso8601String(), e.g. 2024-04-08T02:20:39+00:00."""
    if value is None:
        return None
    return value.strftime("%Y-%m-%dT%H:%M:%S") + "+00:00"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String)
    email: Mapped[str] = mapped_column(String, unique=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(nullable=True)
    password: Mapped[str] = mapped_column(String)
    remember_token: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(nullable=True)

    sessions: Mapped[list[PracticeSession]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    routine: Mapped[Routine | None] = relationship(
        back_populates="user", cascade="all, delete-orphan", uselist=False
    )
    daily_logs: Mapped[list[DailyLog]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def to_dict(self) -> dict:
        # Mirrors Laravel's User model: hides password & remember_token.
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "email_verified_at": _laravel_datetime(self.email_verified_at),
            "created_at": _laravel_datetime(self.created_at),
            "updated_at": _laravel_datetime(self.updated_at),
        }


class PracticeSession(Base):
    __tablename__ = "practice_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String)
    cube: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(nullable=True)

    user: Mapped[User] = relationship(back_populates="sessions")
    solves: Mapped[list[Solve]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="desc(Solve.solved_at)",
    )

    def to_dict(self, include_solves: bool = False) -> dict:
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "cube": self.cube,
            "created_at": _laravel_datetime(self.created_at),
            "updated_at": _laravel_datetime(self.updated_at),
        }
        if include_solves:
            data["solves"] = [s.to_dict() for s in self.solves]
        return data


class Solve(Base):
    __tablename__ = "solves"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    session_id: Mapped[int] = mapped_column(
        ForeignKey("practice_sessions.id", ondelete="CASCADE")
    )
    time: Mapped[int] = mapped_column(Integer)
    scramble: Mapped[str] = mapped_column(Text)
    penalty: Mapped[str] = mapped_column(String, default="OK")
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Multi-phase splits: JSON array of cumulative times (ms) from solve start,
    # the last element equalling `time`. Null for single-phase solves.
    phases: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Inspection time (ms) the solver used before starting; null when the solve
    # was done without inspection.
    inspection_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    solved_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(nullable=True)

    session: Mapped[PracticeSession] = relationship(back_populates="solves")

    def to_dict(self) -> dict:
        # Mirrors Laravel's Solve model: hides session_id/created_at/updated_at,
        # appends an ISO-8601 `date` derived from solved_at.
        return {
            "id": self.id,
            "time": self.time,
            "scramble": self.scramble,
            "penalty": self.penalty,
            "comment": self.comment,
            "phases": json.loads(self.phases) if self.phases else None,
            "inspectionMs": self.inspection_ms,
            "solved_at": _laravel_datetime(self.solved_at),
            "date": _iso8601(self.solved_at),
        }


class Routine(Base):
    """A user's editable daily routine: an ordered list of task definitions
    stored as a JSON array (same Text/JSON idiom as Solve.phases)."""

    __tablename__ = "routines"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True
    )
    # JSON array of task objects: {id, label, icon?, kind, source, cube?, target}.
    tasks: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(nullable=True)

    user: Mapped[User] = relationship(back_populates="routine")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "tasks": json.loads(self.tasks) if self.tasks else [],
            "created_at": _laravel_datetime(self.created_at),
            "updated_at": _laravel_datetime(self.updated_at),
        }


class DailyLog(Base):
    """One row per user per local day: free-text notes, an optional 1-5 rating,
    and a JSON snapshot of per-task progress for that day."""

    __tablename__ = "daily_logs"
    __table_args__ = (UniqueConstraint("user_id", "date", name="uq_daily_log_user_date"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    # Client-local day key, e.g. "2026-06-17".
    date: Mapped[str] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # JSON object keyed by task id: {taskId: {label, kind, target, value, done}}.
    entries: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(nullable=True)

    user: Mapped[User] = relationship(back_populates="daily_logs")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "date": self.date,
            "notes": self.notes,
            "rating": self.rating,
            "entries": json.loads(self.entries) if self.entries else {},
            "created_at": _laravel_datetime(self.created_at),
            "updated_at": _laravel_datetime(self.updated_at),
        }
