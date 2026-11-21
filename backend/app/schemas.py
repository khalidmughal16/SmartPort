from __future__ import annotations

import re
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator

Role = Literal["A", "G", "Y", "D", "B", "C"]
Zone = Literal["General", "Hazardous", "Refrigerated"]
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
    """A container arriving at the terminal (Gate-In), or one row of a manifest."""
    id: str = Field(min_length=1, max_length=24)
    size: str = Field(default="40 ft", max_length=20)
    zone: Zone = "General"
    consignee: Optional[str] = Field(default=None, max_length=80)
    leave: Optional[int] = Field(default=None, description="Planned pick-up time, ms since epoch")


class ImportIn(BaseModel):
    items: list[ContainerIn] = Field(max_length=5000)


class IdsIn(BaseModel):
    ids: list[str] = Field(min_length=1, max_length=500)


class SuggestIn(BaseModel):
    zone: Zone = "General"
    leave: Optional[int] = None


class TaskIn(BaseModel):
    text: str = Field(min_length=3, max_length=120)
    p: int = Field(ge=1, le=9, default=3)


class VesselIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    eta: int = Field(gt=0, description="Arrival time, ms since epoch")
    boxes: int = Field(ge=0, default=0, le=100000)
    berth: str = Field(min_length=1, max_length=10)


class CheckInIn(BaseModel):
    container_id: str = Field(min_length=3, max_length=24)
    truck: str = Field(min_length=1, max_length=20)
    size: str = "40 ft"
    zone: Zone = "General"


class RouteIn(BaseModel):
    obstacles: Optional[list[bool]] = Field(default=None, description="60 cells (10x6 grid); omit for a random map")


class ShipmentIn(BaseModel):
    container_id: str


class BookingIn(BaseModel):
    container_id: str
    purpose: Literal["Pickup", "Drop-off"] = "Pickup"
    date: str = Field(min_length=8, max_length=10, description="YYYY-MM-DD")
    time_range: str = Field(default="08:00-09:00", max_length=20)
