"""
blockchain.py — Algorand ASA creation, opt-in check, and soulbound transfer.
Uses py-algorand-sdk directly — no smart contracts needed for soulbound ASAs.

Soulbound pattern:
  1. Admin creates the ASA with freeze & clawback set to admin.
  2. Student opts in from their wallet (frontend signs this).
  3. Admin transfers 1 unit to student.
  4. Admin immediately freezes the student's holding → non-transferable.
"""

from algosdk.v2client.algod import AlgodClient
from algosdk.v2client.indexer import IndexerClient
from algosdk import transaction, encoding
from wallet import get_admin_account
from config import (
    ALGOD_SERVER, ALGOD_PORT, ALGOD_TOKEN,
    INDEXER_SERVER, INDEXER_PORT, INDEXER_TOKEN,
)


def _algod() -> AlgodClient:
    return AlgodClient(ALGOD_TOKEN, ALGOD_SERVER, headers={"X-API-Key": ALGOD_TOKEN})


def _indexer() -> IndexerClient:
    return IndexerClient(INDEXER_TOKEN, INDEXER_SERVER, headers={"X-API-Key": INDEXER_TOKEN})


# ── 1. Create Event ASA ────────────────────────────────────

def create_event_asset(
    event_name: str,
    total_badges: int,
    unit_name: str = "EVTLN",
) -> int:
    """
    Mint a new ASA for the event.
    - Total supply = total_badges
    - Decimals = 0 (whole-unit NFTs)
    - Freeze + clawback = admin  → enables soulbound mechanics
    - Manager = admin  → can update later if needed
    - Reserve = admin
    Returns the created asset ID.
    """
    admin_sk, admin_addr = get_admin_account()
    client = _algod()
    sp = client.suggested_params()

    txn = transaction.AssetConfigTxn(
        sender=admin_addr,
        sp=sp,
        total=total_badges,
        decimals=0,
        default_frozen=False,
        unit_name=unit_name[:8],            # max 8 chars
        asset_name=f"EventLens: {event_name}"[:32],  # max 32 chars
        url="https://eventlens.app",
        manager=admin_addr,
        reserve=admin_addr,
        freeze=admin_addr,                  # KEY: admin can freeze holdings
        clawback=admin_addr,                # KEY: admin can reclaim if needed
        strict_empty_address_check=False,
    )

    signed = txn.sign(admin_sk)
    tx_id = client.send_transaction(signed)
    result = transaction.wait_for_confirmation(client, tx_id, 4)
    asset_id = result["asset-index"]
    print(f"[blockchain] Created ASA {asset_id} for event '{event_name}'")
    return asset_id


# ── 2. Opt-In Check ────────────────────────────────────────

def opt_in_check(wallet_address: str, asset_id: int) -> bool:
    """
    Verify that the student has opted in to the ASA.
    Uses the Indexer to look up the account's assets.
    """
    if not encoding.is_valid_address(wallet_address):
        raise ValueError(f"Invalid Algorand address: {wallet_address}")

    try:
        client = _algod()
        account_info = client.account_info(wallet_address)
        assets = account_info.get("assets", [])
        return any(a["asset-id"] == asset_id for a in assets)
    except Exception as e:
        print(f"[blockchain] Opt-in check failed: {e}")
        return False


# ── 3. Build Opt-In Transaction (unsigned — signed by frontend) ──

def build_opt_in_txn(wallet_address: str, asset_id: int) -> dict:
    """
    Build an unsigned opt-in transaction for the student to sign in their wallet.
    Returns the transaction as a dict the frontend can reconstruct.
    """
    client = _algod()
    sp = client.suggested_params()

    txn = transaction.AssetTransferTxn(
        sender=wallet_address,
        sp=sp,
        receiver=wallet_address,  # self-transfer = opt-in
        amt=0,
        index=asset_id,
    )

    # Encode for frontend
    return {
        "txn": encoding.msgpack_encode(txn),
        "asset_id": asset_id,
    }


# ── 4. Send Soulbound Token ────────────────────────────────

def send_soulbound_token(wallet_address: str, asset_id: int) -> str:
    """
    Transfer 1 unit of the ASA to the student, then freeze their holding.
    This makes it a soulbound (non-transferable) badge.
    Returns the transfer transaction ID.
    """
    if not encoding.is_valid_address(wallet_address):
        raise ValueError(f"Invalid Algorand address: {wallet_address}")

    admin_sk, admin_addr = get_admin_account()
    client = _algod()

    # Step A: Transfer 1 unit from admin → student
    sp = client.suggested_params()
    transfer_txn = transaction.AssetTransferTxn(
        sender=admin_addr,
        sp=sp,
        receiver=wallet_address,
        amt=1,
        index=asset_id,
    )
    signed_transfer = transfer_txn.sign(admin_sk)
    tx_id = client.send_transaction(signed_transfer)
    transaction.wait_for_confirmation(client, tx_id, 4)
    print(f"[blockchain] Transferred 1 unit of ASA {asset_id} → {wallet_address}")

    # Step B: Freeze the student's holding → soulbound
    sp2 = client.suggested_params()
    freeze_txn = transaction.AssetFreezeTxn(
        sender=admin_addr,
        sp=sp2,
        index=asset_id,
        target=wallet_address,
        new_freeze_state=True,  # FROZEN — cannot transfer
    )
    signed_freeze = freeze_txn.sign(admin_sk)
    freeze_tx_id = client.send_transaction(signed_freeze)
    transaction.wait_for_confirmation(client, freeze_tx_id, 4)
    print(f"[blockchain] Froze ASA {asset_id} for {wallet_address} — soulbound ✓")

    return tx_id


# ── 5. Query Badges (for Profile page) ─────────────────────

def get_wallet_badges(wallet_address: str, known_asset_ids: list[int]) -> list[dict]:
    """
    Return a list of EventLens badges the wallet holds.
    We filter by our known asset IDs to avoid showing random tokens.
    """
    if not encoding.is_valid_address(wallet_address):
        return []

    try:
        client = _algod()
        account_info = client.account_info(wallet_address)
        assets = account_info.get("assets", [])
        badges = []
        for a in assets:
            if a["asset-id"] in known_asset_ids and a["amount"] > 0:
                badges.append({
                    "asset_id": a["asset-id"],
                    "amount": a["amount"],
                    "is_frozen": a.get("is-frozen", False),
                })
        return badges
    except Exception:
        return []
