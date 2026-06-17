from typing import Literal

from pydantic import BaseModel, EmailStr, Field, model_validator

Penalty = Literal["OK", "+2", "DNF"]


class RegisterIn(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    password_confirmation: str

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.password_confirmation:
            raise ValueError("The password field confirmation does not match.")
        return self


class LoginIn(BaseModel):
    email: str
    password: str


class SessionCreateIn(BaseModel):
    name: str = Field(min_length=1)
    cube: str | None = None


class SessionUpdateIn(BaseModel):
    name: str = Field(min_length=1)


class SolveCreateIn(BaseModel):
    time: int = Field(ge=0)
    scramble: str = Field(min_length=1)
    penalty: Penalty | None = None
    # Cumulative phase split times (ms) for multi-phase solves; optional.
    phases: list[int] | None = None
    # Inspection time (ms) used before the solve; optional.
    inspectionMs: int | None = Field(default=None, ge=0)


class SolveUpdateIn(BaseModel):
    penalty: Penalty | None = None
    comment: str | None = None
