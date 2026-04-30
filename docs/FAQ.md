# WorkProof — FAQ

Questions a judge, recruiter, engineer, or candidate is likely to ask during a demo,
plus the canonical answers grounded in the actual codebase.

---

## 1. Product & Pitch

### What is WorkProof in one sentence?
Employment verification powered by zero-knowledge proofs and a deterministic AI trust
score, running on the Midnight Network — recruiters get a credibility signal without
ever seeing the candidate's private data.

### What problem does it solve?
Résumés are built on trust: self-reported claims, an unverified LinkedIn, and reference
calls no one ever makes. WorkProof replaces that trust with cryptographic proof and an
explainable score, while keeping the candidate's personal data private.

### Who are the users?
Three roles, one product:
- **Candidate** — submits a hashed employment claim.
- **Verifier** — an HR contact, peer, or system that confirms a credibility signal.
- **Recruiter** — inspects the trust score and the signals behind it; never sees PII.

### Why now? Why Midnight?
Midnight gives us selective disclosure as a first-class primitive. The chain proves
*what happened*; the AI scores *how much to trust it*. ZK proofs let us commit a claim
without leaking the inputs.

### Is this a real working product?
Yes. Frontend (Vite :3000), FastAPI backend (:8000), Midnight bridge service (:6300),
optional Docker proof server (:6301). `npm run dev` starts everything end-to-end.

---

## 2. Privacy

### What data leaves the candidate's browser?
Only **hashes** and non-identifying metadata. `user_email` and `company_name` are
SHA-256 hashed in the client before any request is sent. Exact employment days are a
**private witness** to the ZK circuit and are never stored or transmitted in cleartext.

### What does the recruiter see?
Trust score (0–100), confidence band (high/medium/low), the verification signals that
fired, and the role/duration band. They never see the email, the real company name,
or the exact dates.

### What does the database store?
Only hashes and metadata. Schema (see [README.md](../README.md)):
`claims`, `verifications`, `ai_scores`, `audit_log` — all keyed on hashes.

### What stays private end-to-end?
Email address, real company name, exact employment dates, verifier identity, raw
résumé content, and the candidate's wallet address.

### Could you reverse the hash and recover the email?
SHA-256 is one-way, but emails have low entropy, so a determined attacker could brute
force common addresses. The on-chain commitment uses a ZK proof, not the raw hash —
the hash itself is only used for client-side joins. For production we'd salt with a
per-user secret stored in the wallet.

---

## 3. Zero-Knowledge Proofs

### What exactly is being proved on-chain?
Two Compact contracts, four circuits:

| Contract | Circuit | Proves |
|---|---|---|
| `claim_proof` | `claim_employment` | A candidate committed a real employment period (days > 0) without disclosing it. |
| `claim_proof` | `verify_claim` | A verifier confirmed a specific signal type for a specific claim. |
| `dataset_proof` | `commit_dataset` | A dataset is de-identified and meets minimum size. |
| `dataset_proof` | `prove_training` | A model was trained on real data of the asserted size. |

### What is `mock` vs `real` ZK mode?
- `real` — Compact contracts compiled and the Midnight Docker proof server is up on
  `:6301`. Full groth16 proofs.
- `mock` — Proof server unreachable. SHA-256 stand-in is used so the demo still works
  end-to-end. Every API response includes a `zk_mode` field so this is never hidden.

### Why a separate Node.js service for Midnight?
The Midnight SDK ships as WASM and only runs in a JS runtime. Python can't host it
directly, so `midnight-service` (Express on :6300) is a thin bridge: backend calls it
over HTTP for proof generation and health.

### Do I need to compile contracts to run the project?
No. `contract/dist/` is committed. Only re-run `npm run compile` if you change a
`.compact` source.

### How are private witnesses kept private?
They're declared as circuit parameters and asserted (`assert days > 0`) but never
passed to `disclose()` or written to the public ledger. They live and die on the
user's machine.

---

## 4. AI Trust Scoring

### Is it really AI?
It's a **deterministic, explainable scoring engine** — not a neural network. We chose
that on purpose: same inputs, same score; auditable rules; no training data leakage;
no black box. See `backend/ai_scoring.py`.

### How is the score computed?
| Signal | Points |
|---|---|
| Email domain matches company | +30 |
| LinkedIn profile consistent | +25 |
| Duration realistic (1–480 months) | +15 |
| Peer endorsements (up to 3) | +7 each (max +20) |
| Suspicious role pattern | −40 |
| Future start/end date | −20 |
| Unrealistic tenure (>40 years) | −15 |

Confidence bands: `high` ≥ 70 · `medium` ≥ 40 · `low` < 40.

### Why deterministic instead of an LLM?
- **Privacy** — the model only ever sees hashes; it can't memorise PII.
- **Anti-gameable** — there's nothing to prompt-inject.
- **Reproducible** — recruiters and auditors can recompute any score.
- **Cheap and fast** — no inference cost, no GPU.

### Can a candidate inflate their score by spamming claims?
No. Suspicious patterns (duplicate verifier, self-endorsement, future dates,
unrealistic tenure) reduce the score. Each verifier+signal pair is idempotent
(HTTP 409 on retry).

### Can a single corrupt verifier game it?
A single signal caps the lift it can produce (+30 max for email domain, +25 for
LinkedIn). A high score requires multiple independent verifiers.

---

## 5. Architecture & Tech

### What's the stack?
React 18 + Vite 8 (frontend) · FastAPI + Python 3.11 (backend) · Node.js + Express
(Midnight bridge) · Compact (ZK contracts) · SQLite or PostgreSQL · Lace extension or
in-browser demo wallet · optional Docker proof server.

### Why FastAPI for the backend if Midnight is JS?
FastAPI gives us first-class async, OpenAPI docs at `/docs`, Pydantic validation, and
a clean separation: the Python side owns business logic, hashing, scoring, and
storage; the Node side only handles WASM/SDK calls.

### How does the wallet flow work?
The frontend uses the Midnight DApp Connector API (`window.midnight`) exposed by the
Lace browser extension. If Lace isn't installed, `wallet.js` auto-falls back to a
demo wallet so the UI is always functional.

### SQLite or PostgreSQL?
Either. SQLite is the default (zero-config, file-based). Set `DATABASE_URL` in
`backend/.env` to switch to Postgres — the `db.py` layer is dual-mode.

### What network does it target?
Midnight **PreProd** by default (`MIDNIGHT_ENV=preprod`). Local Docker network is
also supported for fully offline demos.

---

## 6. Demo & Operations

### How do I run the demo?
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
npm install && npm run install:all
npm run dev
```
Open <http://localhost:3000>.

### Something is on port 8000/6300/3000.
`bash start.sh` kills stale processes on those ports first, then boots everything.

### How do I switch to real ZK proofs?
```bash
docker run -d --name midnight-proof-server -p 6301:6300 \
  midnightntwrk/proof-server:latest
```
Wait ~10s — the Navbar shows a **ZK Real** chip when the next health poll detects it.

### Are there tests?
Yes — `npm test` runs 25 simulation tests across all four circuits.

### Can I run it without Docker, without Lace, without the proof server?
Yes. Mock ZK mode + demo wallet + SQLite is the zero-dependency happy path.

---

## 7. Likely Judge / Skeptic Questions

### "Isn't this just a database with hashes?"
No — the on-chain commitment is generated by a ZK circuit that asserts non-trivial
predicates (employment days > 0, verifier signed a specific claim). The chain proves
those predicates without revealing the inputs. The DB just caches metadata for the UI.

### "What if a verifier lies?"
Each verification is a single signal. The score weights signals by independence and
type, and pattern detection penalises collusion (same verifier across many claims,
self-endorsement, etc.). Multiple independent verifiers are required for a `high`
confidence band.

### "What stops me from claiming I worked at Google?"
Nothing stops you from *submitting* the claim — the value is in *verification*. Until
an independent verifier with a `@google.com` domain (or LinkedIn / document signal)
attests, the score stays low and the confidence band reads `low`.

### "Why would a verifier participate?"
HR teams already field reference calls all day. WorkProof reduces that to a single
signed signal — cheaper for them, faster for the candidate, and they never have to
share an email body or attach a document.

### "What's the on-chain footprint per claim?"
A single ledger entry per circuit invocation with the public commitment fields. No
PII, no résumé text, no exact dates.

### "Can the AI's score be manipulated by adversarial input?"
Inputs are hashes and bounded integers. There's no free-text channel into the
scorer, so no prompt-injection surface and no embedding poisoning.

### "Is the code open source?"
MIT licensed. See [README.md](../README.md).

### "What's next?"
- Per-user salts in the wallet for stronger hash privacy.
- Selective-disclosure proofs over date ranges (prove "≥ 2 years at Big Tech"
  without revealing which company).
- Verifier reputation as an additional signal.
- Recruiter-side filters based on score bands without ever pulling raw claims.

---

## 8. Quick Reference

- **README** — [README.md](../README.md)
- **Live demo script** — [LIVE_DEMO_SCRIPT.md](LIVE_DEMO_SCRIPT.md)
- **Voiceover** — [VOICEOVER_SCRIPT.md](VOICEOVER_SCRIPT.md)
- **Teleprompter** — [TELEPROMPTER.md](TELEPROMPTER.md)
- **Slide deck** — `WorkProof Deck.pptx` (project root)
