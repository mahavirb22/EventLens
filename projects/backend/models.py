"""
models.py — Request/response schemas for EventLens API.
Kept flat and hackathon-friendly. No over-engineering.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Requests ────────────────────────────────────────────────

class VerifyAttendanceRequest(BaseModel):
    """Comes from the frontend after user uploads a photo."""
    event_id: str = Field(..., description="Unique event identifier")
    wallet_address: str = Field(..., description="Student's Algorand wallet address")
    # The image itself is sent as a multipart file — not in this JSON body.


class MintBadgeRequest(BaseModel):
    """Triggered after AI verification passes."""
    event_id: str
    wallet_address: str


class CreateEventRequest(BaseModel):
    """Admin creates a new event."""
    name: str
    description: str
    location: str
    total_badges: int = Field(default=100, ge=1, le=10000)


class OptInRequest(BaseModel):
    """Student opts in to receive the badge ASA."""
    event_id: str
    wallet_address: str


# ── Responses ───────────────────────────────────────────────

class VerifyResponse(BaseModel):
    success: bool
    confidence: float = 0.0
    message: str = ""
    eligible: bool = False


class MintResponse(BaseModel):
    success: bool
    tx_id: str = ""
    asset_id: int = 0
    message: str = ""
    explorer_url: str = ""


class EventOut(BaseModel):
    id: str
    name: str
    description: str
    location: str
    asset_id: int
    total_badges: int
    minted: int = 0


class ProfileBadge(BaseModel):
    asset_id: int
    event_name: str
    event_id: str
    amount: int
