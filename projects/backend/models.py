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
    """Triggered after AI verification passes. Requires verify_token."""
    event_id: str
    wallet_address: str
    verify_token: str = Field(..., description="HMAC token from /verify-attendance proving AI approval")


class CreateEventRequest(BaseModel):
    """Admin creates a new event."""
    name: str
    description: str
    location: str
    total_badges: int = Field(default=100, ge=1, le=10000)
    admin_wallet: str = Field(default="", description="Wallet address of the admin creating the event")


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
    verify_token: str = ""  # HMAC token for minting — only set if eligible


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
    created_at: str = ""


class ProfileBadge(BaseModel):
    asset_id: int
    event_name: str
    event_id: str
    amount: int
    claimed_at: str = ""


class StatsOut(BaseModel):
    total_events: int = 0
    total_badges_minted: int = 0
    total_badges_available: int = 0
    unique_attendees: int = 0
