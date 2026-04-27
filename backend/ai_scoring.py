"""
AI Trust Scoring Engine for WorkProof

Evaluates employment claim credibility based on available signals and
returns a deterministic trust_score (0–100), confidence_level, and flags.

All inputs are already anonymised (hashed) before this module is called —
raw emails, names, and LinkedIn URLs never enter this function.
"""

import re
from datetime import datetime


# ── Signal weights ────────────────────────────────────────────────────────────
WEIGHT_EMAIL_DOMAIN_MATCH  = 30
WEIGHT_LINKEDIN_CONSISTENT = 25
WEIGHT_DURATION_VALID      = 15
WEIGHT_PEER_ENDORSEMENTS   = 20   # scales up to this, not flat
PENALTY_SUSPICIOUS_PATTERN = 40
PENALTY_FUTURE_DATE        = 20
PENALTY_UNREALISTIC_TENURE = 15


def _parse_ym(date_str: str | None) -> datetime | None:
    """Parse 'YYYY-MM' into a datetime. Returns None on failure."""
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str.strip(), "%Y-%m")
    except ValueError:
        return None


def _calc_duration_months(start: str, end: str | None) -> int:
    s = _parse_ym(start)
    if not s:
        return 0
    e = _parse_ym(end) if end else datetime.utcnow()
    delta = (e.year - s.year) * 12 + (e.month - s.month)
    return max(0, delta)


def _is_suspicious_pattern(role: str) -> bool:
    """Flag obviously fabricated roles or company names."""
    suspicious_keywords = ["ceo", "founder", "president", "vp", "chief"]
    role_lower = role.lower()
    # Junior titles with suspiciously senior keywords can be gamed — flag for review
    if any(k in role_lower for k in suspicious_keywords) and "intern" in role_lower:
        return True
    # Unusually short role names (< 3 chars) are suspicious
    if len(role.strip()) < 3:
        return True
    return False


def compute_trust_score(
    role: str,
    start_date: str,
    end_date: str | None,
    email_domain_match: bool = False,
    linkedin_match: bool | None = None,
    endorsements: int = 0,
) -> dict:
    """
    Compute a trust score for a single employment claim.

    Returns:
        {
            "trust_score": int (0–100),
            "confidence_level": "low" | "medium" | "high",
            "flags": list[str],
        }
    """
    score = 0
    flags = []

    # ── Signal 1: email domain match ──────────────────────────────────────────
    if email_domain_match:
        score += WEIGHT_EMAIL_DOMAIN_MATCH
    else:
        flags.append("email_domain_unverified")

    # ── Signal 2: LinkedIn consistency ───────────────────────────────────────
    if linkedin_match is True:
        score += WEIGHT_LINKEDIN_CONSISTENT
    elif linkedin_match is None:
        flags.append("linkedin_not_provided")
    else:
        flags.append("linkedin_inconsistent")

    # ── Signal 3: duration realism ────────────────────────────────────────────
    duration = _calc_duration_months(start_date, end_date)
    now = datetime.utcnow()
    start_dt = _parse_ym(start_date)
    end_dt   = _parse_ym(end_date) if end_date else None

    if start_dt and start_dt > now:
        score -= PENALTY_FUTURE_DATE
        flags.append("start_date_in_future")
    elif end_dt and end_dt > now:
        score -= PENALTY_FUTURE_DATE
        flags.append("end_date_in_future")
    elif duration > 0:
        score += WEIGHT_DURATION_VALID

    # Flag unrealistically long tenures (> 40 years = 480 months)
    if duration > 480:
        score -= PENALTY_UNREALISTIC_TENURE
        flags.append("unrealistic_tenure")

    # ── Signal 4: peer endorsements ───────────────────────────────────────────
    if endorsements and endorsements > 0:
        # Diminishing returns: first 3 endorsements give full weight
        capped = min(endorsements, 3)
        score += int(WEIGHT_PEER_ENDORSEMENTS * (capped / 3))
    else:
        flags.append("no_peer_endorsements")

    # ── Signal 5: suspicious pattern detection ────────────────────────────────
    if _is_suspicious_pattern(role):
        score -= PENALTY_SUSPICIOUS_PATTERN
        flags.append("suspicious_role_pattern")

    # ── Clamp ─────────────────────────────────────────────────────────────────
    score = max(0, min(100, score))

    # ── Confidence level ──────────────────────────────────────────────────────
    if score >= 70:
        confidence = "high"
    elif score >= 40:
        confidence = "medium"
    else:
        confidence = "low"

    # If no verification signals were supplied at all, downgrade confidence
    if not email_domain_match and linkedin_match is None and not endorsements:
        confidence = "low"
        if "unverified_claim" not in flags:
            flags.append("unverified_claim")

    return {
        "trust_score": score,
        "confidence_level": confidence,
        "flags": flags,
    }
