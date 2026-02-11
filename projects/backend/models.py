"""
models.py — Request/response schemas for EventLens API.
Pydantic v2 models with proper validation.
"""

from pydantic import BaseModel, Field
from typing import Optional


# ── Requests ────────────────────────────────────────────────

class VerifyAttendanceRequest(BaseModel):
    """Comes from the frontend after user uploads a photo."""
    event_id: str = Field(..., description="Unique event identifier")
    wallet_address: str = Field(..., description="Student's Algorand wallet address")
    latitude: Optional[float] = Field(None, description="GPS latitude from browser geolocation")
    longitude: Optional[float] = Field(None, description="GPS longitude from browser geolocation")
    # The image itself is sent as a multipart file — not in this JSON body.


class MintBadgeRequest(BaseModel):
    """Triggered after AI verification passes. Requires verify_token."""
    event_id: str
    wallet_address: str
    verify_token: str = Field(..., description="HMAC token from /verify-attendance proving AI approval")


class AdminLoginRequest(BaseModel):
    """Admin login with password."""
    password: str
    wallet: str = Field(default="", description="Optional wallet address for extra context")


class CreateEventRequest(BaseModel):
    """Admin creates a new event."""
    name: str
    description: str
    location: str
    latitude: Optional[float] = Field(None, description="Venue GPS latitude for geolocation checks")
    longitude: Optional[float] = Field(None, description="Venue GPS longitude for geolocation checks")
    date_start: str = Field(default="", description="Event start datetime ISO string")
    date_end: str = Field(default="", description="Event end datetime ISO string")
    total_badges: int = Field(default=100, ge=1, le=10000)
    admin_wallet: str = Field(default="", description="Wallet address of the admin creating the event")
    admin_token: str = Field(default="", description="Admin session token from /admin/login")


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
    image_hash: str = ""  # SHA-256 hash of the uploaded image (audit trail)
    geo_check: Optional[str] = None  # "pass" | "fail" | "unavailable"


class MintResponse(BaseModel):
    success: bool
    tx_id: str = ""
    asset_id: int = 0
    message: str = ""
    explorer_url: str = ""
    proof_recorded: bool = False  # Whether on-chain proof was stored


class EventOut(BaseModel):
    id: str
    name: str
    description: str
    location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    date_start: str = ""
    date_end: str = ""
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
    image_hash: str = ""  # SHA-256 of the verification image
    ai_confidence: int = 0  # AI score at time of verification


class StatsOut(BaseModel):
    total_events: int = 0
    total_badges_minted: int = 0
    total_badges_available: int = 0
    unique_attendees: int = 0
