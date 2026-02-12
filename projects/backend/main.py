"""
main.py — FastAPI entry point for EventLens backend.
Run with:  uvicorn main:app --reload --port 8000

Features:
  - AI-verified attendance with multi-layer verification (vision + geo + EXIF)
  - Soulbound badge minting on Algorand
  - On-chain proof recording via EventLens smart contract
  - Rate limiting to prevent abuse
  - Image hash audit trail
"""

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
from collections import defaultdict

from config import (
    CORS_ORIGINS, ADMIN_WALLETS, ADMIN_PASSWORD, ADMIN_TOKEN_SECRET,
    RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW,
)
from models import (
    MintBadgeRequest, CreateEventRequest, AdminLoginRequest,
    VerifyResponse, MintResponse, EventOut, ProfileBadge, StatsOut,
)
from ai_judge import full_verification, compute_image_hash
from certificate_generator import generate_certificate
from blockchain import (
    create_event_asset, opt_in_check, send_soulbound_token,
    get_wallet_badges, build_opt_in_txn, record_proof_onchain,
)
from event_store import (
    create_event, get_event, list_events,
    increment_minted, has_claimed, get_all_asset_ids,
    get_stats, get_claim_time, get_claim_proof,
)
from verify_token import create_verify_token, validate_verify_token


# ── Rate Limiting ───────────────────────────────────────────

_rate_limit_store: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(client_ip: str) -> bool:
    """
    Sliding window rate limiter.
    Returns True if request is allowed, False if rate limited.
    """
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW
    # Clean old entries
    _rate_limit_store[client_ip] = [
        t for t in _rate_limit_store[client_ip] if t > window_start
    ]
    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_REQUESTS:
        return False
    _rate_limit_store[client_ip].append(now)
    return True


# ── Lifespan ────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🔭 EventLens backend starting…")
    print(f"   Rate limit: {RATE_LIMIT_REQUESTS} requests / {RATE_LIMIT_WINDOW}s window")
    yield
    print("EventLens backend shutting down.")


# ── App ─────────────────────────────────────────────────────

app = FastAPI(
    title="EventLens API",
    description="Trustless attendance verification with AI + Algorand soulbound tokens + on-chain proofs",
    version="3.0.0",
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
    return {"status": "ok", "service": "eventlens", "version": "3.0.0"}


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
            latitude=req.latitude,
            longitude=req.longitude,
            date_start=req.date_start,
            date_end=req.date_end,
            certificate_theme=req.certificate_theme,
            certificate_colors=req.certificate_colors,
            venue_photos=req.venue_photos,
        )
        return EventOut(**event, venue_photos_count=len(event.get("venue_photos", [])))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/events", response_model=list[EventOut])
async def list_events_endpoint():
    """Return all events."""
    return [EventOut(**e, venue_photos_count=len(e.get("venue_photos", []))) for e in list_events()]


@app.get("/events/{event_id}", response_model=EventOut)
async def get_event_endpoint(event_id: str):
    event = get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return EventOut(**event, venue_photos_count=len(event.get("venue_photos", [])))


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
    request: Request,
    event_id: str = Form(...),
    wallet_address: str = Form(...),
    student_name: str = Form(...),
    image: UploadFile = File(...),
    latitude: float | None = Form(None),
    longitude: float | None = Form(None),
):
    """
    Multi-layer attendance verification:
      Layer 1: Gemini Vision AI — image analysis
      Layer 2: GPS geolocation — proximity check
      Layer 3: EXIF metadata — timestamp/editing checks
      Layer 4: Image hash — SHA-256 audit trail

    Returns composite confidence score + signed verify_token if eligible.
    """
    # Rate limit check
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")

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

    # Run full multi-layer verification
    result = await full_verification(
        image_bytes=image_bytes,
        event_name=event["name"],
        location=event.get("location", ""),
        user_lat=latitude,
        user_lon=longitude,
        venue_lat=event.get("latitude"),
        venue_lon=event.get("longitude"),
        venue_photos=event.get("venue_photos", []),
    )

    confidence = result["confidence"]
    eligible = confidence >= 80
    image_hash = result["image_hash"]

    # Generate signed token only if eligible — this is proof of AI approval
    token = ""
    if eligible:
        token = create_verify_token(event_id, wallet_address, confidence, image_hash, student_name)

    return VerifyResponse(
        success=True,
        confidence=confidence,
        message=result["reason"],
        eligible=eligible,
        verify_token=token,
        image_hash=image_hash,
        geo_check=result.get("geo_check"),
    )


# ── Mint Badge ──────────────────────────────────────────────

@app.post("/mint-badge", response_model=MintResponse)
async def mint_badge(req: MintBadgeRequest):
    """
    Transfer 1 soulbound ASA to wallet + record on-chain proof.
    REQUIRES a valid verify_token from /verify-attendance — prevents bypassing AI.
    """
    event = get_event(req.event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # ── SECURITY: Validate the verification token ──
    token_data = validate_verify_token(req.verify_token, req.event_id, req.wallet_address)
    if not token_data:
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

        # Extract image_hash, confidence, and student_name from token
        image_hash = token_data.get("image_hash", "")
        ai_confidence = token_data.get("confidence", 0)
        student_name = token_data.get("student_name", "")

        # Record in event store with proof data
        increment_minted(
            req.event_id,
            req.wallet_address,
            image_hash=image_hash,
            ai_confidence=ai_confidence,
            student_name=student_name,
        )

        # Record verification proof on-chain (non-blocking, non-fatal)
        proof_recorded = False
        proof_tx = record_proof_onchain(
            event_id=req.event_id,
            attendee_address=req.wallet_address,
            image_hash=image_hash,
            ai_confidence=ai_confidence,
            asset_id=event["asset_id"],
            tx_id=tx_id,
        )
        if proof_tx:
            proof_recorded = True

        # Generate attendance certificate
        certificate_url = ""
        try:
            certificate_url = generate_certificate(
                student_name=student_name or "Student",
                event_name=event["name"],
                event_date=event.get("date_start", ""),
                location=event.get("location", ""),
                theme=event.get("certificate_theme", "modern"),
                custom_colors=event.get("certificate_colors"),
                tx_id=tx_id,
            )
        except Exception as cert_error:
            print(f"[mint_badge] Certificate generation failed: {cert_error}")
            # Non-fatal - continue without certificate

        explorer_url = f"https://testnet.explorer.perawallet.app/tx/{tx_id}"
        return MintResponse(
            success=True,
            tx_id=tx_id,
            asset_id=event["asset_id"],
            message="Soulbound badge minted successfully!",
            explorer_url=explorer_url,
            proof_recorded=proof_recorded,
            certificate_url=certificate_url,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Profile / Badges ───────────────────────────────────────

@app.get("/profile/{wallet_address}/badges")
async def get_profile_badges(wallet_address: str):
    """
    Return all EventLens badges held by a wallet.
    Merges on-chain data with our event store for names, timestamps, and proof data.
    """
    all_asset_ids = get_all_asset_ids()
    if not all_asset_ids:
        return []

    on_chain = get_wallet_badges(wallet_address, all_asset_ids)

    # Enrich with event names, claim timestamps, and proof data
    events = list_events()
    asset_to_event = {e["asset_id"]: e for e in events}

    badges = []
    for b in on_chain:
        event_data = asset_to_event.get(b["asset_id"], {})
        event_id = event_data.get("id", "")
        claim_proof = get_claim_proof(event_id, wallet_address) if event_id else {}
        badges.append(ProfileBadge(
            asset_id=b["asset_id"],
            event_name=event_data.get("name", "Unknown Event"),
            event_id=event_id,
            amount=b["amount"],
            claimed_at=claim_proof.get("claimed_at", ""),
            image_hash=claim_proof.get("image_hash", ""),
            ai_confidence=claim_proof.get("ai_confidence", 0),
        ))

    return badges
