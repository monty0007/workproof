import os
import httpx

ZK_SERVICE_URL = os.getenv("ZK_SERVICE_URL", "http://localhost:6300")


async def submit_claim_proof(payload: dict) -> dict:
    """POST /submit-claim-proof to midnight-service (port 6300).

    payload keys: claim_id, user_hash, company_hash, claim_hash, timestamp
    Returns: { proofHash, mode }
    """
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{ZK_SERVICE_URL}/submit-claim-proof",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()


async def submit_verify_proof(payload: dict) -> dict:
    """POST /submit-verify-proof to midnight-service (port 6300).

    payload keys: claim_id, verifier_hash, verification_type, claim_hash
    Returns: { proofHash, mode }
    """
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.post(
            f"{ZK_SERVICE_URL}/submit-verify-proof",
            json=payload,
        )
        resp.raise_for_status()
        return resp.json()
