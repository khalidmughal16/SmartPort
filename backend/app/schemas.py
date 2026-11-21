from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator
import re

Role = Literal["A", "G", "Y", "D", "B", "C"]
_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class _Email(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def _ok(cls, v: str) -> str:
        v = v.strip().lower()
        if not _EMAIL.match(v):
            raise ValueError("Enter a valid email address.")
        return v


class LoginIn(_Email):
    password: str = Field(min_length=1)


class SignupIn(_Email):
    name: str = Field(min_length=2, max_length=80)
    password: str
    role: Role = "C"
    invite: str = ""
    company: str = ""

    @field_validator("password")
    @classmethod
    def _pw(cls, v: str) -> str:
        if len(v) < 8 or not re.search(r"[A-Za-z]", v) or not re.search(r"\d", v):
            raise ValueError("Use 8+ characters with a letter and a number.")
        return v


class ContainerIn(BaseModel):
    id: str = Field(min_length=3, max_length=20)
    hazard: bool = False


class SuggestIn(BaseModel):
    leave_day: int = Field(ge=1, le=60, description="Day the container is expected to leave")
    hazard: bool = False


class PlaceIn(SuggestIn):
    container_id: str


class CheckInIn(BaseModel):
    container_id: str = Field(min_length=3, max_length=20)
    truck: str = Field(min_length=1, max_length=20)
    type: Literal["40 ft HC", "20 ft", "Reefer"] = "40 ft HC"
    hazard: bool = False


class TaskIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    priority: int = Field(ge=1, le=9, default=3)


class RouteIn(BaseModel):
    obstacles: Optional[list[bool]] = Field(default=None, description="60 cells (10x6 grid); omit for a random map")


class ShipmentIn(BaseModel):
    container_id: str


class BookingIn(BaseModel):
    container_id: str
    purpose: Literal["Pickup", "Drop-off"] = "Pickup"
    date: str = Field(min_length=8, max_length=10, description="YYYY-MM-DD")
    time_range: str = "08:00-09:00"
