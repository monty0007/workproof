import hashlib
import logging
import sys
import time
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from models import EmploymentClaimRequest, VerifyClaimRequest
from db import (
    init_db, insert_claim, get_claim, list_claims,
    get_claims_by_user, update_claim_verified,
    insert_verification, get_verifications,
    insert_ai_score, get_ai_score,
    append_audit, get_audit_log,
)
from zk_client import submit_claim_proof, submit_verify_proof
from ai_scoring import compute_trust_score

# ── Logging setup ─────────────────────────────────────────────────────────────
CYAN   = "\033[36m";  GREEN  = "\033[32m";  YELLOW = "\033[33m"
RED    = "\033[31m";  GREY   = "\033[90m";  BOLD   = "\033[1m";  RESET = "\033[0m"

class ColourFormatter(logging.Formatter):
    LEVEL_COLOURS = {
        logging.DEBUG:    GREY   + "DEBUG" + RESET,
        logging.INFO:     GREEN  + "INFO " + RESET,
        logging.WARNING:  YELLOW + "WARN " + RESET,
        logging.ERROR:    RED    + "ERROR" + RESET,
        logging.CRITICAL: RED    + BOLD + "CRIT " + RESET,
    }
    def format(self, record):
        ts   = datetime.now().strftime("%H:%M:%S")
        lvl  = self.LEVEL_COLOURS.get(record.levelno, record.levelname)
        tag  = CYAN + f"[{record.name}]" + RESET
        return f"{GREY}{ts}{RESET} {lvl} {tag} {record.getMessage()}"

def _make_logger(name: str) -> logging.Logger:
    log = logging.getLogger(name)
    if not log.handlers:
        h = logging.StreamHandler(sys.stdout)
        h.setFormatter(ColourFormatter())
        log.addHandler(h)
    log.setLevel(logging.DEBUG)
    log.propagate = False
    return log

log      = _make_logger("backend")
log_req  = _make_logger("http")
log_zk   = _make_logger("zk")
log_ai   = _make_logger("ai")

# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(title="WorkProof API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    log_req.info(f"→ {request.method} {request.url.path}")
    response: Response = await call_next(request)
    ms = (time.perf_counter() - start) * 1000
    colour = GREEN if response.status_code < 400 else YELLOW if response.status_code < 500 else RED
    log_req.info(f"← {colour}{response.status_code}{RESET} {request.url.path}  {ms:.0f}ms")
    return response

@app.on_event("startup")
async def on_startup():
    await init_db()
    from db import _db_mode
    db_label = "PostgreSQL" if _db_mode == "postgres" else "SQLite (local)"
    log.info(f"{BOLD}WorkProof backend started{RESET}  →  http://localhost:8000")
    log.info(f"Database: {CYAN}{db_label}{RESET}")
    log.info("Docs: http://localhost:8000/docs")


def sha256(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


# ── POST /api/claim ───────────────────────────────────────────────────────────
@app.post("/api/claim")
async def submit_claim(req: EmploymentClaimRequest):
    claim_id  = str(uuid.uuid4())
    timestamp = datetime.now(timezone.utc).isoformat()

    # Hash identity fields — raw values are NEVER stored
    user_hash    = sha256(req.user_email.lower().strip())
    company_hash = sha256(req.company_name.lower().strip())

    # Duration calculation
    from ai_scoring import _calc_duration_months
    duration_months = _calc_duration_months(req.start_date, req.end_date)

    # Claim fingerprint — commits all public fields
    claim_hash = sha256(f"{user_hash}{company_hash}{req.role}{req.start_date}{req.end_date or ''}{timestamp}")

    log.info(f"New claim  user={user_hash[:12]}…  company={company_hash[:12]}…  role={req.role}")

    # Run initial AI score (no verification signals yet)
    ai_result = compute_trust_score(
        role=req.role,
        start_date=req.start_date,
        end_date=req.end_date,
    )
    log_ai.info(f"Initial score  claim={claim_id[:12]}…  score={ai_result['trust_score']}  confidence={ai_result['confidence_level']}")

    # Submit claim proof to ZK service
    log_zk.info("Calling midnight-service › claim_employment circuit")
    # employment_days: private witness proving duration > 0 (never disclosed on-chain)
    employment_days = max(1, duration_months * 30)
    try:
        zk_result = await submit_claim_proof({
            "claim_id":       claim_id,
            "user_hash":      user_hash,
            "company_hash":   company_hash,
            "claim_hash":     claim_hash,
            "timestamp":      timestamp,
            "employment_days": employment_days,
        })
        proof_hash = zk_result.get("proofHash", "")
        zk_mode    = zk_result.get("mode", "mock")
        log_zk.info(f"claim_employment › mode={zk_mode}  hash={proof_hash[:16]}…")
    except Exception as e:
        log_zk.warning(f"midnight-service unreachable ({e}), using local mock hash")
        proof_hash = sha256(f"{claim_id}{claim_hash}WORKPROOF_ZK")
        zk_mode    = "mock"

    await insert_claim({
        "claim_id":       claim_id,
        "user_hash":      user_hash,
        "company_hash":   company_hash,
        "role":           req.role,
        "start_date":     req.start_date,
        "end_date":       req.end_date,
        "duration_months":duration_months,
        "claim_hash":     claim_hash,
        "timestamp":      timestamp,
        "proof_hash":     proof_hash,
        "zk_mode":        zk_mode,
        "verified":       0,
        "trust_score":    ai_result["trust_score"],
    })

    # Persist initial AI score
    await insert_ai_score({
        "claim_id":        claim_id,
        "trust_score":     ai_result["trust_score"],
        "confidence_level":ai_result["confidence_level"],
        "flags":           ai_result["flags"],
    })

    await append_audit(claim_id, "claim_submitted", user_hash)

    log.info(f"Claim stored  id={claim_id[:12]}…  score={ai_result['trust_score']}  mode={zk_mode}")
    return {
        "claim_id":        claim_id,
        "proof_hash":      proof_hash,
        "trust_score":     ai_result["trust_score"],
        "confidence_level":ai_result["confidence_level"],
        "flags":           ai_result["flags"],
        "zk_mode":         zk_mode,
    }


# ── POST /api/verify ──────────────────────────────────────────────────────────
@app.post("/api/verify")
async def verify_claim(req: VerifyClaimRequest):
    claim = await get_claim(req.claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    verifier_hash = sha256(req.verifier_email.lower().strip())
    timestamp     = datetime.now(timezone.utc).isoformat()

    # Determine email domain match if a domain was provided
    email_domain_match = False
    if req.company_email_domain:
        user_email_domain = req.verifier_email.split("@")[-1].lower().strip() if "@" in req.verifier_email else ""
        email_domain_match = (user_email_domain == req.company_email_domain.lower().strip())

    # Re-score with new verification signals
    ai_result = compute_trust_score(
        role=claim["role"],
        start_date=claim["start_date"],
        end_date=claim.get("end_date"),
        email_domain_match=email_domain_match,
        linkedin_match=req.linkedin_match,
        endorsements=req.endorsements or 0,
    )
    log_ai.info(f"Updated score  claim={req.claim_id[:12]}…  score={ai_result['trust_score']}  type={req.verification_type}")

    # ZK verify proof
    log_zk.info("Calling midnight-service › verify_claim circuit")
    try:
        zk_result = await submit_verify_proof({
            "claim_id":          req.claim_id,
            "verifier_hash":     verifier_hash,
            "verification_type": req.verification_type,
            "claim_hash":        claim["claim_hash"],
        })
        proof_hash = zk_result.get("proofHash", "")
        zk_mode    = zk_result.get("mode", "mock")
    except Exception as e:
        log_zk.warning(f"midnight-service unreachable ({e}), using local mock hash")
        proof_hash = sha256(f"{req.claim_id}{verifier_hash}{timestamp}VERIFY_ZK")
        zk_mode    = "mock"

    inserted = await insert_verification({
        "claim_id":          req.claim_id,
        "verifier_hash":     verifier_hash,
        "verification_type": req.verification_type,
        "proof_hash":        proof_hash,
    })
    if not inserted:
        raise HTTPException(status_code=409, detail=f"You have already submitted a '{req.verification_type}' signal for this claim")

    await update_claim_verified(req.claim_id, ai_result["trust_score"])

    await insert_ai_score({
        "claim_id":         req.claim_id,
        "trust_score":      ai_result["trust_score"],
        "confidence_level": ai_result["confidence_level"],
        "flags":            ai_result["flags"],
    })

    await append_audit(req.claim_id, "claim_verified", verifier_hash)

    return {
        "claim_id":         req.claim_id,
        "verification_type":req.verification_type,
        "proof_hash":       proof_hash,
        "trust_score":      ai_result["trust_score"],
        "confidence_level": ai_result["confidence_level"],
        "flags":            ai_result["flags"],
        "zk_mode":          zk_mode,
    }


# ── GET /api/profile/{user_email_hash} ───────────────────────────────────────
@app.get("/api/profile/{user_hash}")
async def get_profile(user_hash: str):
    """Return all verified claims + latest AI scores for a user hash."""
    claims = await get_claims_by_user(user_hash)
    if not claims:
        raise HTTPException(status_code=404, detail="No claims found for this user")

    result = []
    for c in claims:
        score = await get_ai_score(c["claim_id"])
        verifs = await get_verifications(c["claim_id"])
        result.append({
            "claim_id":        c["claim_id"],
            "company_hash":    c["company_hash"],
            "role":            c["role"],
            "start_date":      c["start_date"],
            "end_date":        c.get("end_date"),
            "duration_months": c["duration_months"],
            "verified":        c["verified"],
            "proof_hash":      c["proof_hash"],
            "zk_mode":         c["zk_mode"],
            "timestamp":       c["timestamp"],
            "trust_score":     score["trust_score"] if score else c["trust_score"],
            "confidence_level":score["confidence_level"] if score else "low",
            "flags":           score["flags"] if score else [],
            "verifications":   len(verifs),
        })
    return result


# ── GET /api/claims ───────────────────────────────────────────────────────────
@app.get("/api/claims")
async def list_all_claims():
    """Public list of claims — no raw emails or company names."""
    rows = await list_claims()
    return [
        {
            "claim_id":       c["claim_id"],
            "company_hash":   c["company_hash"],
            "role":           c["role"],
            "start_date":     c["start_date"],
            "end_date":       c.get("end_date"),
            "duration_months":c["duration_months"],
            "verified":       c["verified"],
            "trust_score":    c["trust_score"],
            "zk_mode":        c["zk_mode"],
            "timestamp":      c["timestamp"],
        }
        for c in rows
    ]


# ── GET /api/audit/log (before /{claim_id} to avoid route conflict) ──────────
@app.get("/api/audit/log")
async def get_audit_log_route():
    rows = await get_audit_log()
    return rows


# ── GET /api/audit/{claim_id} ─────────────────────────────────────────────────
@app.get("/api/audit/{claim_id}")
async def audit_claim(claim_id: str):
    log.info(f"Audit requested  id={claim_id[:12]}…")
    claim = await get_claim(claim_id)
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    await append_audit(claim_id, "audit_query", "")

    verifs = await get_verifications(claim_id)
    score  = await get_ai_score(claim_id)

    ts = claim.get("timestamp")
    try:
        ts_unix = datetime.fromisoformat(ts).timestamp() if ts else None
    except Exception:
        ts_unix = None

    return {
        "claim_id":         claim_id,
        "company_hash":     claim["company_hash"],
        "role":             claim["role"],
        "start_date":       claim["start_date"],
        "end_date":         claim.get("end_date"),
        "duration_months":  claim["duration_months"],
        "verified":         claim["verified"] == 1,
        "proof_hash":       claim["proof_hash"],
        "zk_mode":          claim["zk_mode"],
        "trust_score":      score["trust_score"] if score else claim["trust_score"],
        "confidence_level": score["confidence_level"] if score else "low",
        "flags":            score["flags"] if score else [],
        "verifications":    [
            {
                "verification_type": v["verification_type"],
                "proof_hash":        v["proof_hash"],
                "timestamp":         v.get("timestamp", ""),
            }
            for v in verifs
        ],
        "timestamp":        ts_unix,
    }


# ── GET /health ───────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}

