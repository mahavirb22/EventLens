"""
EventLens Smart Contract — On-chain event registry + verification proof storage.

Stores:
  - Event metadata (name, location, date) in Boxes
  - Verification proofs (image_hash, ai_confidence, timestamp) per badge claim
  - Per-event claim count

This moves the trust model from "trust the backend" to "verify on-chain".
"""

from algopy import *
from algopy.arc4 import abimethod, String as Arc4String, UInt64 as Arc4UInt64


class EventLens(ARC4Contract):
    """
    ARC4 smart contract for on-chain event management and verification proofs.
    Deployed once; admin registers events and records verification proofs.
    """

    admin: Account
    event_count: UInt64
    total_proofs: UInt64

    def __init__(self) -> None:
        """Initialize contract with deployer as admin."""
        self.admin = Txn.sender
        self.event_count = UInt64(0)
        self.total_proofs = UInt64(0)
        # BoxMap: event_id (bytes) → event metadata (bytes)
        self.events = BoxMap(Bytes, Bytes, key_prefix=b"evt_")
        # BoxMap: proof key (bytes) → proof data (bytes)
        self.proofs = BoxMap(Bytes, Bytes, key_prefix=b"prf_")
        # BoxMap: event_id → claim count
        self.claim_counts = BoxMap(Bytes, UInt64, key_prefix=b"cnt_")

    @abimethod()
    def register_event(
        self,
        event_id: Arc4String,
        name: Arc4String,
        location: Arc4String,
        date_start: Arc4UInt64,
        date_end: Arc4UInt64,
        asset_id: Arc4UInt64,
        total_badges: Arc4UInt64,
    ) -> Arc4String:
        """
        Register a new event on-chain. Only callable by admin.
        Stores event metadata in a Box for permanent on-chain record.
        """
        assert Txn.sender == self.admin, "Only admin can register events"

        eid = event_id.native
        # Serialize event data as pipe-delimited string
        event_data = (
            name.native
            + b"|"
            + location.native
            + b"|"
            + op.itob(date_start.native)
            + b"|"
            + op.itob(date_end.native)
            + b"|"
            + op.itob(asset_id.native)
            + b"|"
            + op.itob(total_badges.native)
        )
        self.events[eid] = event_data
        self.claim_counts[eid] = UInt64(0)
        self.event_count += UInt64(1)

        return event_id

    @abimethod()
    def record_proof(
        self,
        event_id: Arc4String,
        attendee: Account,
        image_hash: Arc4String,
        ai_confidence: Arc4UInt64,
        asset_id: Arc4UInt64,
        tx_id: Arc4String,
    ) -> Arc4UInt64:
        """
        Record an attendance verification proof on-chain.
        Called after badge minting — creates immutable audit trail.

        Stores: image_hash | confidence | timestamp | asset_id | tx_id
        Returns the updated claim count for the event.
        """
        assert Txn.sender == self.admin, "Only admin can record proofs"

        eid = event_id.native
        # Ensure event exists
        _event_data, exists = self.events.maybe(eid)
        assert exists, "Event not registered"

        # Build proof key: event_id + attendee address
        proof_key = eid + b":" + attendee.bytes

        # Serialize proof data
        proof_data = (
            image_hash.native
            + b"|"
            + op.itob(ai_confidence.native)
            + b"|"
            + op.itob(Global.latest_timestamp)
            + b"|"
            + op.itob(asset_id.native)
            + b"|"
            + tx_id.native
        )
        self.proofs[proof_key] = proof_data
        self.total_proofs += UInt64(1)

        # Increment claim count
        count, cnt_exists = self.claim_counts.maybe(eid)
        if cnt_exists:
            self.claim_counts[eid] = count + UInt64(1)
        else:
            self.claim_counts[eid] = UInt64(1)

        return Arc4UInt64(self.claim_counts[eid])

    @abimethod(readonly=True)
    def get_event(self, event_id: Arc4String) -> Arc4String:
        """Read event metadata from chain. Returns pipe-delimited data."""
        data, exists = self.events.maybe(event_id.native)
        assert exists, "Event not found"
        return Arc4String.from_bytes(data)

    @abimethod(readonly=True)
    def get_proof(self, event_id: Arc4String, attendee: Account) -> Arc4String:
        """Read verification proof for a specific attendee at an event."""
        proof_key = event_id.native + b":" + attendee.bytes
        data, exists = self.proofs.maybe(proof_key)
        assert exists, "No proof found"
        return Arc4String.from_bytes(data)

    @abimethod(readonly=True)
    def get_claim_count(self, event_id: Arc4String) -> Arc4UInt64:
        """Get the number of badges claimed for an event."""
        count, exists = self.claim_counts.maybe(event_id.native)
        if exists:
            return Arc4UInt64(count)
        return Arc4UInt64(0)

    @abimethod(readonly=True)
    def get_stats(self) -> Arc4String:
        """Return contract-level stats: event_count|total_proofs."""
        return Arc4String.from_bytes(
            op.itob(self.event_count) + b"|" + op.itob(self.total_proofs)
        )

    @abimethod()
    def transfer_admin(self, new_admin: Account) -> None:
        """Transfer admin role to a new account."""
        assert Txn.sender == self.admin, "Only admin can transfer admin role"
        self.admin = new_admin
