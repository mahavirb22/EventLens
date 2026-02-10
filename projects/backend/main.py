"""
main.py — FastAPI entry point for EventLens backend.
Run with:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import CORS_ORIGINS, ADMIN_WALLETS, ADMIN_PASSWORD, ADMIN_TOKEN_SECRET
from models import (
    MintBadgeRequest, CreateEventRequest, AdminLoginRequest,
    VerifyResponse, MintResponse, EventOut, ProfileBadge, StatsOut,
)
from ai_judge import verify_attendance_image
from blockchain import (
    create_event_asset, opt_in_check, send_soulbound_token,
    get_wallet_badges, build_opt_in_txn,
)
from event_store import (
    create_event, get_event, list_events,
    increment_minted, has_claimed, get_all_asset_ids,
    get_stats, get_claim_time,
)
from verify_token import create_verify_token, validate_verify_token


# ── Lifespan ────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔭 EventLens backend starting…")
    yield
    print("EventLens backend shutting down.")


# ── App ─────────────────────────────────────────────────────

app = FastAPI(
    title="EventLens API",
    description="Trustless attendance verification with AI + Algorand soulbound tokens",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ──────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "eventlens", "version": "2.0.0"}


# ── Admin Auth ─────────────────────────────────────────

import hmac
import hashlib
import time

def _create_admin_token(wallet: str) -> str:
    """Create an HMAC admin session token. Valid for 24 hours."""
    ts = str(int(time.time()))
    payload = f"admin:{wallet}:{ts}"
    sig = hmac.new(ADMIN_TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{ts}:{sig}"

def _validate_admin_token(token: str) -> bool:
    """Validate an admin session token."""
    try:
        parts = token.split(":")
        if len(parts) != 2:
            return False
        ts, provided_sig = parts
        timestamp = int(ts)
        # Token valid for 24 hours
        if time.time() - timestamp > 86400:
            return False
        # We can't know the wallet from token alone, so verify signature
        # by checking all possible wallets or just verifying the format
        # For simplicity, regenerate with empty wallet (admin-level access)
        payload = f"admin::{ts}"
        expected_sig = hmac.new(ADMIN_TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(expected_sig, provided_sig):
            return True
        # Also check with any admin wallet
        for w in (ADMIN_WALLETS or [""]):
            payload = f"admin:{w}:{ts}"
            expected_sig = hmac.new(ADMIN_TOKEN_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
            if hmac.compare_digest(expected_sig, provided_sig):
                return True
        return False
    except Exception:
        return False


@app.post("/admin/login")
async def admin_login(req: AdminLoginRequest):
    """Authenticate admin with password. Returns a session token."""
    if req.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin password")
    token = _create_admin_token(req.wallet)
    return {"success": True, "admin_token": token}


@app.get("/is-admin")
async def is_admin(wallet: str):
    """Check if wallet is an authorized admin. Used by frontend to show/hide admin UI."""
    return {"is_admin": wallet in ADMIN_WALLETS if ADMIN_WALLETS else False}


# ── Platform Stats ─────────────────────────────────────────

@app.get("/stats", response_model=StatsOut)
async def get_platform_stats():
    """Platform-wide statistics for the dashboard hero section."""
    return StatsOut(**get_stats())


# ── Events CRUD ─────────────────────────────────────────────

@app.post("/events", response_model=EventOut)
async def create_event_endpoint(req: CreateEventRequest):
    """Admin creates a new event + mints its ASA on Algorand. Requires admin_token."""
    # Admin guard: verify admin session token (password-based)
    if not req.admin_token or not _validate_admin_token(req.admin_token):
        raise HTTPException(
            status_code=403,
            detail="Invalid or expired admin session. Please login with admin password."
        )
    # Optional: also check wallet whitelist if configured
    if ADMIN_WALLETS and req.admin_wallet and req.admin_wallet not in ADMIN_WALLETS:
        raise HTTPException(
            status_code=403,
            detail="Only authorized admin wallets can create events."
        )

    try:
        asset_id = create_event_asset(req.name, req.total_badges)
        event = create_event(
            name=req.name,
            description=req.description,
            location=req.location,
            asset_id=asset_id,
            total_badges=req.total_badges,
        )
        return EventOut(**event)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/events", response_model=list[EventOut])
async def list_events_endpoint():
    """Return all events."""
    return [EventOut(**e) for e in list_events()]


@app.get("/events/{event_id}", response_model=EventOut)
async def get_event_endpoint(event_id: str):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventOut(**event)


# ── Opt-In ──────────────────────────────────────────────────

@app.get("/events/{event_id}/opt-in-txn")
async def get_opt_in_txn(event_id: str, wallet: str):
    """
    Build an unsigned opt-in transaction for the student.
    The frontend signs with their wallet and submits.
    """
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    try:
        txn_data = build_opt_in_txn(wallet, event["asset_id"])
        return {"success": True, **txn_data}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/events/{event_id}/opt-in-check")
async def check_opt_in(event_id: str, wallet: str):
    """Check if the student has opted in to this event's ASA."""
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    opted_in = opt_in_check(wallet, event["asset_id"])
    return {"opted_in": opted_in}


# ── AI Verification ────────────────────────────────────────

@app.post("/verify-attendance", response_model=VerifyResponse)
async def verify_attendance(
    event_id: str = Form(...),
    wallet_address: str = Form(...),
    image: UploadFile = File(...),
):
    """
    Accept image + event_id.
    Send image to Gemini → return confidence score + signed verify_token.
    The verify_token is required for /mint-badge (prevents unauthorized mints).
    """
    # Validate event exists
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Check if already claimed
    if has_claimed(event_id, wallet_address):
        return VerifyResponse(
            success=False,
            confidence=0,
            message="You have already claimed this badge.",
            eligible=False,
        )

    # Read image bytes
    image_bytes = await image.read()
    if len(image_bytes) > 10 * 1024 * 1024:  # 10 MB limit
        raise HTTPException(status_code=400, detail="Image too large (max 10 MB)")

    # Send to Gemini — now with location context
    result = await verify_attendance_image(
        image_bytes,
        event["name"],
        location=event.get("location", ""),
    )
    confidence = result["confidence"]
    eligible = confidence >= 80

    # Generate signed token only if eligible — this is proof of AI approval
    token = ""
    if eligible:
        token = create_verify_token(event_id, wallet_address, confidence)

    return VerifyResponse(
        success=True,
        confidence=confidence,
        message=result["reason"],
        eligible=eligible,
        verify_token=token,
    )


# ── Mint Badge ──────────────────────────────────────────────

@app.post("/mint-badge", response_model=MintResponse)
async def mint_badge(req: MintBadgeRequest):
    """
    Transfer 1 soulbound ASA to wallet.
    REQUIRES a valid verify_token from /verify-attendance — prevents bypassing AI.
    """
    event = get_event(req.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # ── SECURITY: Validate the verification token ──
    if not validate_verify_token(req.verify_token, req.event_id, req.wallet_address):
        raise HTTPException(
            status_code=403,
            detail="Invalid or expired verification token. Please verify attendance first."
        )

    # Guard: already claimed
    if has_claimed(req.event_id, req.wallet_address):
        raise HTTPException(status_code=409, detail="Badge already claimed")

    # Guard: supply exhausted
    if event["minted"] >= event["total_badges"]:
        raise HTTPException(status_code=410, detail="All badges have been claimed")

    # Guard: student must have opted in
    if not opt_in_check(req.wallet_address, event["asset_id"]):
        raise HTTPException(
            status_code=400,
            detail="Wallet has not opted in to the event ASA. Opt in first.",
        )

    try:
        tx_id = send_soulbound_token(req.wallet_address, event["asset_id"])
        increment_minted(req.event_id, req.wallet_address)
        explorer_url = f"https://testnet.explorer.perawallet.app/tx/{tx_id}"
        return MintResponse(
            success=True,
            tx_id=tx_id,
            asset_id=event["asset_id"],
            message="Soulbound badge minted successfully!",
            explorer_url=explorer_url,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profile / Badges ───────────────────────────────────────

@app.get("/profile/{wallet_address}/badges")
async def get_profile_badges(wallet_address: str):
    """
    Return all EventLens badges held by a wallet.
    Merges on-chain data with our event store for names + timestamps.
    """
    all_asset_ids = get_all_asset_ids()
    if not all_asset_ids:
        return []

    on_chain = get_wallet_badges(wallet_address, all_asset_ids)

    # Enrich with event names and claim timestamps
    events = list_events()
    asset_to_event = {e["asset_id"]: e for e in events}

    badges = []
    for b in on_chain:
        event_data = asset_to_event.get(b["asset_id"], {})
        event_id = event_data.get("id", "")
        claimed_at = get_claim_time(event_id, wallet_address) if event_id else ""
        badges.append(ProfileBadge(
            asset_id=b["asset_id"],
            event_name=event_data.get("name", "Unknown Event"),
            event_id=event_id,
            amount=b["amount"],
            claimed_at=claimed_at,
        ))

    return badges
