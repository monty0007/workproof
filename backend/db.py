# ─── Database layer ───────────────────────────────────────────────────────────
# Tries PostgreSQL (asyncpg) first; falls back to local SQLite (aiosqlite)
# when the remote DB is unreachable — so the app always works offline.
#
# Tables:
#   claims         — employment claims (no raw emails, no raw company names)
#   verifications  — verification events per claim
#   ai_scores      — AI trust scores per claim
#   audit_log      — immutable audit trail
#
# Privacy note: user_email and company_name are SHA-256 hashed before storage.
# Raw identifiers exist only during the API request lifetime.
# ─────────────────────────────────────────────────────────────────────────────

import os
import json
import aiosqlite
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "")

# SQLite file lives next to this module
_SQLITE_PATH = os.path.join(os.path.dirname(__file__), "workproof.db")

# After startup, this is set to "postgres" or "sqlite"
_db_mode: str = "sqlite"
_pg_pool = None   # asyncpg pool when Postgres is reachable


async def _try_postgres():
    """Return an asyncpg pool if DATABASE_URL is set and reachable, else None."""
    if not DATABASE_URL:
        return None
    try:
        import asyncpg
        pool = await asyncpg.create_pool(DATABASE_URL, min_size=1, max_size=10,
                                          timeout=8)
        async with pool.acquire() as c:
            await c.fetchval("SELECT 1")
        return pool
    except Exception:
        return None


async def init_db():
    """Create tables (Postgres or SQLite). Called on app startup."""
    global _db_mode, _pg_pool

    _pg_pool = await _try_postgres()
    if _pg_pool:
        _db_mode = "postgres"
        async with _pg_pool.acquire() as conn:
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS claims (
                    claim_id        TEXT PRIMARY KEY,
                    user_hash       TEXT NOT NULL,
                    company_hash    TEXT NOT NULL,
                    role            TEXT NOT NULL,
                    start_date      TEXT NOT NULL,
                    end_date        TEXT,
                    duration_months INTEGER NOT NULL DEFAULT 0,
                    claim_hash      TEXT NOT NULL,
                    timestamp       TIMESTAMPTZ NOT NULL,
                    proof_hash      TEXT NOT NULL,
                    zk_mode         TEXT NOT NULL DEFAULT 'mock',
                    verified        INTEGER NOT NULL DEFAULT 0,
                    trust_score     INTEGER NOT NULL DEFAULT 0
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS verifications (
                    id                  SERIAL PRIMARY KEY,
                    claim_id            TEXT NOT NULL,
                    verifier_hash       TEXT NOT NULL,
                    verification_type   TEXT NOT NULL,
                    proof_hash          TEXT NOT NULL,
                    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS ai_scores (
                    id               SERIAL PRIMARY KEY,
                    claim_id         TEXT NOT NULL,
                    trust_score      INTEGER NOT NULL,
                    confidence_level TEXT NOT NULL,
                    flags            JSONB NOT NULL DEFAULT '[]',
                    timestamp        TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
            await conn.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id          SERIAL PRIMARY KEY,
                    claim_id    TEXT NOT NULL,
                    event_type  TEXT NOT NULL,
                    actor_hash  TEXT NOT NULL DEFAULT '',
                    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            """)
    else:
        _db_mode = "sqlite"
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS claims (
                    claim_id        TEXT PRIMARY KEY,
                    user_hash       TEXT NOT NULL,
                    company_hash    TEXT NOT NULL,
                    role            TEXT NOT NULL,
                    start_date      TEXT NOT NULL,
                    end_date        TEXT,
                    duration_months INTEGER NOT NULL DEFAULT 0,
                    claim_hash      TEXT NOT NULL,
                    timestamp       TEXT NOT NULL,
                    proof_hash      TEXT NOT NULL,
                    zk_mode         TEXT NOT NULL DEFAULT 'mock',
                    verified        INTEGER NOT NULL DEFAULT 0,
                    trust_score     INTEGER NOT NULL DEFAULT 0
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS verifications (
                    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                    claim_id            TEXT NOT NULL,
                    verifier_hash       TEXT NOT NULL,
                    verification_type   TEXT NOT NULL,
                    proof_hash          TEXT NOT NULL,
                    timestamp           TEXT NOT NULL
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS ai_scores (
                    id               INTEGER PRIMARY KEY AUTOINCREMENT,
                    claim_id         TEXT NOT NULL,
                    trust_score      INTEGER NOT NULL,
                    confidence_level TEXT NOT NULL,
                    flags            TEXT NOT NULL DEFAULT '[]',
                    timestamp        TEXT NOT NULL
                )
            """)
            await db.execute("""
                CREATE TABLE IF NOT EXISTS audit_log (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    claim_id    TEXT NOT NULL,
                    event_type  TEXT NOT NULL,
                    actor_hash  TEXT NOT NULL DEFAULT '',
                    timestamp   TEXT NOT NULL
                )
            """)
            await db.commit()


# ── Claims helpers ────────────────────────────────────────────────────────────

async def insert_claim(c: dict):
    ts = c["timestamp"]
    ts_str = ts if isinstance(ts, str) else ts.isoformat()
    ts_dt  = datetime.fromisoformat(ts_str) if isinstance(ts, str) else ts

    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO claims (
                    claim_id, user_hash, company_hash, role,
                    start_date, end_date, duration_months,
                    claim_hash, timestamp, proof_hash, zk_mode,
                    verified, trust_score
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
            """,
                c["claim_id"], c["user_hash"], c["company_hash"], c["role"],
                c["start_date"], c.get("end_date"), c["duration_months"],
                c["claim_hash"], ts_dt, c["proof_hash"], c["zk_mode"],
                c["verified"], c["trust_score"],
            )
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            await db.execute("""
                INSERT INTO claims (
                    claim_id, user_hash, company_hash, role,
                    start_date, end_date, duration_months,
                    claim_hash, timestamp, proof_hash, zk_mode,
                    verified, trust_score
                ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
            """, (
                c["claim_id"], c["user_hash"], c["company_hash"], c["role"],
                c["start_date"], c.get("end_date"), c["duration_months"],
                c["claim_hash"], ts_str, c["proof_hash"], c["zk_mode"],
                c["verified"], c["trust_score"],
            ))
            await db.commit()


async def get_claim(claim_id: str) -> dict | None:
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM claims WHERE claim_id = $1", claim_id)
        return _row_to_dict(row) if row else None
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM claims WHERE claim_id = ?", (claim_id,)) as cur:
                row = await cur.fetchone()
        return _sqlite_row(row) if row else None


async def get_claims_by_user(user_hash: str) -> list[dict]:
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM claims WHERE user_hash = $1 ORDER BY timestamp DESC", user_hash
            )
        return [_row_to_dict(r) for r in rows]
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM claims WHERE user_hash = ? ORDER BY timestamp DESC", (user_hash,)
            ) as cur:
                rows = await cur.fetchall()
        return [_sqlite_row(r) for r in rows]


async def list_claims() -> list[dict]:
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            rows = await conn.fetch("SELECT * FROM claims ORDER BY timestamp DESC")
        return [_row_to_dict(r) for r in rows]
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM claims ORDER BY timestamp DESC") as cur:
                rows = await cur.fetchall()
        return [_sqlite_row(r) for r in rows]


async def update_claim_verified(claim_id: str, trust_score: int):
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            await conn.execute(
                "UPDATE claims SET verified = 1, trust_score = $2 WHERE claim_id = $1",
                claim_id, trust_score,
            )
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            await db.execute(
                "UPDATE claims SET verified = 1, trust_score = ? WHERE claim_id = ?",
                (trust_score, claim_id),
            )
            await db.commit()


# ── Verification helpers ──────────────────────────────────────────────────────

async def insert_verification(v: dict):
    now = datetime.now(timezone.utc).isoformat()
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            # Idempotent: same verifier + type for the same claim is rejected
            existing = await conn.fetchrow("""
                SELECT 1 FROM verifications
                WHERE claim_id = $1 AND verifier_hash = $2 AND verification_type = $3
            """, v["claim_id"], v["verifier_hash"], v["verification_type"])
            if existing:
                return False
            await conn.execute("""
                INSERT INTO verifications (claim_id, verifier_hash, verification_type, proof_hash)
                VALUES ($1, $2, $3, $4)
            """, v["claim_id"], v["verifier_hash"], v["verification_type"], v["proof_hash"])
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            # Idempotent: same verifier + type for the same claim is rejected
            async with db.execute("""
                SELECT 1 FROM verifications
                WHERE claim_id = ? AND verifier_hash = ? AND verification_type = ?
            """, (v["claim_id"], v["verifier_hash"], v["verification_type"])) as cur:
                if await cur.fetchone():
                    return False
            await db.execute("""
                INSERT INTO verifications (claim_id, verifier_hash, verification_type, proof_hash, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (v["claim_id"], v["verifier_hash"], v["verification_type"], v["proof_hash"], now))
            await db.commit()
    return True


async def get_verifications(claim_id: str) -> list[dict]:
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM verifications WHERE claim_id = $1 ORDER BY timestamp DESC", claim_id
            )
        return [dict(r) for r in rows]
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM verifications WHERE claim_id = ? ORDER BY timestamp DESC", (claim_id,)
            ) as cur:
                rows = await cur.fetchall()
        return [dict(r) for r in rows]


# ── AI score helpers ──────────────────────────────────────────────────────────

async def insert_ai_score(s: dict):
    now = datetime.now(timezone.utc).isoformat()
    flags_json = json.dumps(s.get("flags", []))
    if _db_mode == "postgres":
        import asyncpg
        async with _pg_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO ai_scores (claim_id, trust_score, confidence_level, flags)
                VALUES ($1, $2, $3, $4)
            """, s["claim_id"], s["trust_score"], s["confidence_level"],
                asyncpg.types.pg_types.JSONB(flags_json))
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            await db.execute("""
                INSERT INTO ai_scores (claim_id, trust_score, confidence_level, flags, timestamp)
                VALUES (?, ?, ?, ?, ?)
            """, (s["claim_id"], s["trust_score"], s["confidence_level"], flags_json, now))
            await db.commit()


async def get_ai_score(claim_id: str) -> dict | None:
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            row = await conn.fetchrow(
                "SELECT * FROM ai_scores WHERE claim_id = $1 ORDER BY timestamp DESC LIMIT 1",
                claim_id
            )
        if not row:
            return None
        d = dict(row)
        if hasattr(d.get("timestamp"), "isoformat"):
            d["timestamp"] = d["timestamp"].isoformat()
        return d
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM ai_scores WHERE claim_id = ? ORDER BY timestamp DESC LIMIT 1",
                (claim_id,)
            ) as cur:
                row = await cur.fetchone()
        if not row:
            return None
        d = dict(row)
        if isinstance(d.get("flags"), str):
            try:
                d["flags"] = json.loads(d["flags"])
            except Exception:
                d["flags"] = []
        return d


# ── Audit log helpers ─────────────────────────────────────────────────────────

async def append_audit(claim_id: str, event_type: str = "query", actor_hash: str = ""):
    now = datetime.now(timezone.utc).isoformat()
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO audit_log (claim_id, event_type, actor_hash) VALUES ($1, $2, $3)",
                claim_id, event_type, actor_hash,
            )
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            await db.execute(
                "INSERT INTO audit_log (claim_id, event_type, actor_hash, timestamp) VALUES (?, ?, ?, ?)",
                (claim_id, event_type, actor_hash, now),
            )
            await db.commit()


async def get_audit_log() -> list[dict]:
    if _db_mode == "postgres":
        async with _pg_pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT claim_id, event_type, actor_hash, timestamp FROM audit_log ORDER BY timestamp DESC"
            )
        return [{"claim_id": r["claim_id"], "event_type": r["event_type"],
                 "actor_hash": r["actor_hash"], "timestamp": r["timestamp"].isoformat()} for r in rows]
    else:
        async with aiosqlite.connect(_SQLITE_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT claim_id, event_type, actor_hash, timestamp FROM audit_log ORDER BY timestamp DESC"
            ) as cur:
                rows = await cur.fetchall()
        return [dict(r) for r in rows]


# ── Row helpers ───────────────────────────────────────────────────────────────

def _row_to_dict(row) -> dict:
    d = dict(row)
    if hasattr(d.get("timestamp"), "isoformat"):
        d["timestamp"] = d["timestamp"].isoformat()
    return d


def _sqlite_row(row) -> dict:
    return dict(row)

