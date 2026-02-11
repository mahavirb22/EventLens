"""
Deploy configuration for the EventLens smart contract.
"""

import logging
from algosdk.v2client.algod import AlgodClient
from algokit_utils import (
    ApplicationSpecification,
    EnsureBalanceParameters,
    ensure_funded,
    get_localnet_default_account,
)

logger = logging.getLogger(__name__)


def deploy() -> None:
    """Deploy the EventLens contract to localnet for testing."""
    from smart_contracts.artifacts.eventlens.eventlens_client import (
        EventLensClient,
    )
    from algokit_utils import get_algod_client, get_default_localnet_config

    algod_client = get_algod_client(get_default_localnet_config("algod"))
    deployer = get_localnet_default_account(algod_client)

    app_client = EventLensClient(
        algod_client=algod_client,
        creator=deployer,
        indexer_client=None,
    )

    app_client.deploy(
        on_schema_break="replace",
        on_update="update",
    )

    logger.info(f"EventLens contract deployed. App ID: {app_client.app_id}")
