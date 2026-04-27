# WorkProof

**AI-powered employment verification using ZK proofs + trust scoring on the Midnight Network.**

Users prove they worked at companies — claims are committed on-chain, AI-scored for credibility, and verifiable by recruiters without blind trust.

**GitHub Topics:** `midnightntwrk` · `compact` · `zero-knowledge` · `employment-verification` · `midnight-network`

---

## How It Works

```
User submits employment claim
    → company_name + role + duration
    → SHA-256 hashed (never stored raw)
    → claim_employment ZK circuit

Verifier confirms employment signal
    → email domain / LinkedIn / document / manual
    → verify_claim circuit runs
    → AI trust score updated

Recruiter checks profile
    → sees verified claims + trust score (0–100)
    → no blind résumé trust needed
```

---

## Architecture

```
Browser (React + Vite :3000)
    │
    ├── /api/*  →  FastAPI backend (:8000)
    │                   ├── aiosqlite  →  SQLite workproof.db  (default)
    │                   ├── asyncpg   →  PostgreSQL            (if DATABASE_URL set)
    │                   ├── ai_scoring.py   →  trust score engine
    │                   └── zk_client.py    →  midnight-service (:6300)
    │                                              ├── @midnight-ntwrk SDK (WASM)
    │                                              └── Docker proof server (:6301)
    │
    └── wallet.js  →  Lace browser extension (Midnight DApp Connector API)
                      Falls back to in-browser demo wallet automatically
```

| Service | Port | Language | Responsibility |
|---------|------|----------|----------------|
| Frontend | 3000 | React 18 + Vite 8 | Three-role UI: User, Verifier, Recruiter |
| Backend | 8000 | Python / FastAPI | REST API, hashing, DB, AI scoring, ZK orchestration |
| Midnight Service | 6300 | Node.js / Express | Midnight SDK bridge (WASM cannot run in Python) |
| Proof Server | 6301 | Docker | ZK circuit execution — optional, mock used when absent |
| Database | — | SQLite / PostgreSQL | Stores only hashes + metadata (never raw PII) |

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | FastAPI backend |
| Node.js | 20+ | Midnight service + frontend |
| Docker | any | Midnight proof server (optional — mock mode works without it) |

> **macOS / Linux** — the commands below use `bash`/`zsh`. **Windows** users: use Git Bash or WSL, or replace `source .venv/bin/activate` with `.venv\Scripts\activate`.

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/workproof.git
cd workproof

# 2. Python virtual env + deps
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt

# 3. Node deps (root + frontend + midnight-service)
npm install
npm run install:all

# 4. Environment variables (defaults work — no changes needed for local dev)
cp backend/.env.example backend/.env
cp midnight-service/.env.example midnight-service/.env

# 5. Start all three services
#    (re-activate venv if you opened a new terminal since step 2)
source .venv/bin/activate
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Midnight service | http://localhost:6300 |

> The contracts are **pre-compiled** in `contract/dist/`. You do NOT need the Compact compiler to run.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `ModuleNotFoundError: aiosqlite` | Run `pip install -r backend/requirements.txt` inside the activated venv |
| Backend won't start | Make sure `.venv` is activated: `source .venv/bin/activate` |
| Port already in use | Run `bash start.sh` — it kills stale processes on :8000 :6300 :3000 first |
| `npm run install:all` fails | Run manually: `cd frontend && npm install && cd ../midnight-service && npm install` |
| Midnight service shows `contract_compiled: false` | Run `npm run compile` to regenerate `contract/dist/` |
| ZK mode stuck on `mock` | Start the Docker proof server (see below) and wait 10s for auto-detection |

### Optional: recompile contracts (Nightforge)

[Nightforge](https://docs.midnight.network/develop/tutorial/building/nightforge) is the Midnight Compact compiler toolchain. It is already installed as a dev dependency — you do **not** need to install it globally.

```bash
# Recompile both Compact contracts (outputs to contract/dist/)
npm run compile
```

What this does:
- Reads `midnight.config.js` (source: `./contract/src`, output: `contract/dist`)
- Compiles `claim_proof.compact` → 2 circuits (`claim_employment`, `verify_claim`)
- Compiles `dataset_proof.compact` → 2 circuits (`commit_dataset`, `prove_training`)
- Generates proving/verifier keys, zkir bytecode, and JS bindings in `contract/dist/`

> The compiled output is committed to the repo — **no recompilation needed to run the project**. Only recompile if you change the `.compact` source files.

If you want to install nightforge globally:

```bash
npm install -g nightforge
nightforge compile
```

### Optional: run circuit simulation tests

```bash
npm test
# → 25 tests across 4 circuits
```

### Optional: Docker proof server (real ZK groth16 proofs)

By default the project runs in **mock mode** — ZK proofs are simulated with SHA-256 hashes. To run real groth16 proofs you need the Midnight proof server running in Docker.

```bash
# Pull and start the Midnight proof server
docker pull midnightntwrk/proof-server:latest

docker run -d \
  --name midnight-proof-server \
  -p 6301:6300 \
  midnightntwrk/proof-server:latest

# Verify it's running
docker logs midnight-proof-server
curl http://localhost:6301/health
```

Once running, the midnight-service detects it automatically on the next health poll (every 10s) and switches to `zk_mode: real`. The Navbar in the frontend shows a **ZK Real** chip when real proofs are active.

To stop:
```bash
docker stop midnight-proof-server
docker rm midnight-proof-server
```

> The proof server always runs locally (`localhost:6301`) — it never calls out to external servers, keeping private witness data on your machine.

### Optional: Lace wallet (real Midnight wallet connection)

Without Lace installed the app auto-connects to a **demo wallet** — the full UI works, but no real on-chain transactions are signed.

To use a real Midnight wallet:
1. Install the [Lace browser extension](https://www.lace.io/)
2. In Lace → Settings → Network → select **PreProd**
3. Fund your wallet from the [Midnight PreProd faucet](https://docs.midnight.network/develop/tutorial/using/faucet)
4. Click **Connect Wallet** in the WorkProof navbar

### Optional: use PostgreSQL instead of SQLite

Create `backend/.env`:
```
DATABASE_URL=postgresql://user:password@host:5432/dbname?sslmode=require
```

---

## Project Structure

```
workproof/
├── backend/
│   ├── main.py              # FastAPI routes
│   ├── models.py            # Pydantic request models
│   ├── db.py                # Dual-mode DB layer (PostgreSQL + SQLite)
│   ├── ai_scoring.py        # Deterministic trust scoring (0–100)
│   ├── zk_client.py         # HTTP client → midnight-service
│   └── requirements.txt
├── contract/
│   ├── src/
│   │   ├── claim_proof.compact   # ZK contract: employment claims (2 circuits)
│   │   └── dataset_proof.compact # ZK contract: dataset compliance (2 circuits)
│   ├── dist/                     # Pre-compiled output (keys, zkir, JS bindings)
│   └── test/
│       └── circuit.test.js       # 25 simulation tests for all 4 circuits
├── frontend/
│   └── src/
│       ├── App.jsx               # Tab routing
│       ├── views/
│       │   ├── HomeView.jsx      # Landing page
│       │   ├── UserView.jsx      # Submit employment claims
│       │   ├── VerificationView.jsx  # Verify claims + audit log
│       │   └── RecruiterView.jsx     # Browse proven claims
│       ├── midnight/
│       │   ├── wallet.js         # Lace DApp Connector + demo fallback
│       │   ├── api.js            # midnight-service health polling
│       │   └── config.js         # Network + endpoint config
│       └── hooks/
│           ├── useMidnight.js    # Wallet state, ZK mode, service health
│           └── useLocalStorage.js
├── midnight-service/
│   └── index.js             # Express: /submit-claim-proof, /submit-verify-proof, /health
├── midnight.config.js       # Nightforge compiler config
├── start.sh                 # Alternative launcher (bash)
└── package.json             # Root npm scripts — `npm run dev` starts everything
```

---

## ZK Contracts

Two Compact contracts with four circuits total:

### `claim_proof.compact` — Employment Claims

| Circuit | Proves | Key inputs |
|---------|--------|------------|
| `claim_employment` | User submitted a real employment period | `user_hash`, `company_hash`, `claim_hash`, `timestamp`, `employment_days` (private witness) |
| `verify_claim` | Verifier confirmed employment signal | `verifier_hash`, `claim_hash`, `verification_type` |

All string inputs are `Opaque<"string">` (hashed on the client). `employment_days` is a `Uint<32>` private witness — asserted `> 0` inside the circuit, never committed to the ledger.

### `dataset_proof.compact` — Dataset Compliance

| Circuit | Proves | Private witnesses (never disclosed) |
|---------|--------|-------------------------------------|
| `commit_dataset` | Dataset is de-identified and meets minimum size | `record_count`, `min_record_count`, `deidentified` |
| `prove_training` | Model was trained on real data | `training_rows` |

Private witnesses are asserted inside the circuit but never disclosed to the ledger.

### Dual-Ledger Model

- **Public ledger:** `export ledger` fields written via `disclose()` — visible on-chain
- **Private witnesses:** circuit parameters asserted but never disclosed — stay on the user's device
- The midnight-service uses both `wallet-sdk-shielded` and `wallet-sdk-unshielded-wallet` packages

---

## AI Trust Scoring

`ai_scoring.py` computes a deterministic 0–100 score per claim:

| Signal | Points |
|--------|--------|
| Email domain matches company | +30 |
| LinkedIn profile consistent | +25 |
| Duration realistic (1–480 months) | +15 |
| Peer endorsements (up to 3) | +7 each (max +20) |
| Suspicious role pattern | −40 |
| Future start/end date | −20 |
| Unrealistic tenure (>40 years) | −15 |

Confidence: `high` ≥ 70 · `medium` ≥ 40 · `low` < 40

---

## ZK Modes

| Mode | Condition | Behaviour |
|------|-----------|-----------|
| `real` | Contract compiled + proof server on :6301 | Full ZK circuits via groth16 |
| `mock` | Proof server unreachable / contract missing | SHA-256 hash used as proof fallback |

The service auto-detects at startup. All API responses include a `zk_mode` field.

---

## Wallet

The frontend uses the **Lace** browser extension via the Midnight DApp Connector API (`window.midnight`). If Lace is not installed, the app automatically falls back to a **demo wallet** — no extension needed to test the UI.

---

## API Reference

### `POST /api/claim`
Submit an employment claim.

```json
{
  "user_email": "user@company.com",
  "company_name": "Deloitte",
  "role": "Senior Consultant",
  "start_date": "2022-06",
  "end_date": "2024-01"
}
```
→ `{ claim_id, proof_hash, trust_score, confidence_level, flags, zk_mode }`

> `user_email` and `company_name` are SHA-256 hashed before any processing — never stored raw.

### `POST /api/verify`
Verify a claim with a credibility signal.

```json
{
  "claim_id": "...",
  "verifier_email": "hr@deloitte.com",
  "verification_type": "email_domain",
  "company_email_domain": "deloitte.com",
  "endorsements": 2
}
```
→ `{ claim_id, verification_type, proof_hash, trust_score, confidence_level, flags, zk_mode }`

> **Idempotent:** the same verifier cannot submit the same signal type twice for the same claim (HTTP 409). Different verifiers can each independently submit the same signal type.

### `GET /api/profile/{user_hash}`
All verified claims + AI scores for a user (by SHA-256 email hash).

### `GET /api/claims`
Public list of all claims (no raw emails or company names).

### `GET /api/audit/{claim_id}`
Full proof + verification record for a claim.

### `GET /api/audit/log`
Full event log across all claims.

### `GET /health`
Backend health check.

---

## Database Schema

All tables store **only hashes and metadata** — no raw PII.

```sql
claims          -- claim_id, user_hash, company_hash, role, start_date, end_date,
                --   duration_months, claim_hash, proof_hash, verified, trust_score, zk_mode

verifications   -- claim_id, verifier_hash, verification_type, proof_hash, timestamp

ai_scores       -- claim_id, trust_score, confidence_level, flags, timestamp

audit_log       -- claim_id, event_type, actor_hash, timestamp
```

---

## Network Configuration

`midnight.config.js` and `frontend/src/midnight/config.js` support:

| Network | Indexer | Node | Use |
|---------|--------|------|-----|
| `local` | `http://127.0.0.1:8088` | `http://127.0.0.1:9944` | Local dev / Docker |
| `preprod` | `https://indexer.preprod.midnight.network` | `https://rpc.preprod.midnight.network` | Midnight PreProd testnet |

Set `MIDNIGHT_ENV=preprod` in `midnight-service/.env` to target the Midnight PreProd testnet (default).

---

## Midnight SDK Packages

| Package | Version |
|---------|---------|
| `@midnight-ntwrk/compact-runtime` | ^0.15.0 |
| `@midnight-ntwrk/midnight-js-contracts` | ^4.0.2 |
| `@midnight-ntwrk/midnight-js-network-id` | ^4.0.2 |
| `@midnight-ntwrk/wallet-sdk-*` | ^2.1–3.1 |
| `@midnight-ntwrk/dapp-connector-api` | ^4.0.1 |
| `nightforge` (compiler) | ^0.0.6 |
| Compact pragma | `language_version >= 0.22` |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ZK Contract | Compact (Midnight Network DSL) |
| Blockchain | Midnight Network (PreProd / local) |
| Backend | FastAPI + Python 3.11+ |
| AI Scoring | Deterministic signal weighting (pure Python) |
| Database | PostgreSQL / SQLite (asyncpg / aiosqlite) |
| Frontend | React 18 + Vite 8 + Tailwind CSS |
| Midnight Bridge | Node.js + Express + Midnight SDK (WASM) |
| ZK Proof Engine | Docker — `midnightntwrk/proof-server` (groth16) |
| Wallet | Lace extension + in-browser demo fallback |

---

## License

MIT
