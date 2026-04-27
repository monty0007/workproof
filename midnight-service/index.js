// ─── WorkProof Midnight Service ──────────────────────────────────────────────
// Node.js middleware that bridges the Python backend and the Midnight Network.
//
// Why a separate service?
//   The Midnight SDK ships WASM + Node.js-only modules (fs, path, crypto) that
//   cannot run inside FastAPI/Python. This service runs in Node.js where those
//   modules are available natively.
//
// Architecture:
//   Backend (FastAPI:8000)
//     → calls this service (midnight-service:6300)
//   This service
//     → @midnight-ntwrk/* SDK (WASM, Node.js)
//     → Proof server (localhost:6301) — always local, privacy requirement
//     → Midnight testnet or local node
//
// Mock mode (default): sha256 hashes computed locally, no proof server needed.
// Real mode: actual ZK circuits invoked via Midnight SDK + proof server.
// ─────────────────────────────────────────────────────────────────────────────

import express from 'express'
import cors from 'cors'
import crypto from 'crypto'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id'

// ── Structured logger ────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',  bold:   '\x1b[1m',
  grey:   '\x1b[90m', cyan:   '\x1b[36m', green:  '\x1b[32m',
  yellow: '\x1b[33m', red:    '\x1b[31m', magenta:'\x1b[35m',
}
function ts() { return new Date().toTimeString().slice(0,8) }
const log = {
  info:  (tag, msg) => console.log(`${C.grey}${ts()}${C.reset} ${C.green}INFO ${C.reset} ${C.magenta}[${tag}]${C.reset} ${msg}`),
  warn:  (tag, msg) => console.log(`${C.grey}${ts()}${C.reset} ${C.yellow}WARN ${C.reset} ${C.magenta}[${tag}]${C.reset} ${msg}`),
  error: (tag, msg) => console.log(`${C.grey}${ts()}${C.reset} ${C.red}ERROR${C.reset} ${C.magenta}[${tag}]${C.reset} ${msg}`),
  debug: (tag, msg) => console.log(`${C.grey}${ts()}${C.reset} ${C.grey}DEBUG${C.reset} ${C.magenta}[${tag}]${C.reset} ${msg}`),
  req:   (method, path, status, ms) => {
    const sc = status < 400 ? C.green : status < 500 ? C.yellow : C.red
    console.log(`${C.grey}${ts()}${C.reset} ${C.cyan}HTTP ${C.reset} ${C.magenta}[midnight]${C.reset} ${method} ${path} → ${sc}${status}${C.reset}  ${ms}ms`)
  },
}

// ── __dir must be defined before loadZKDeps uses it ───────────────────────────
const __dir = dirname(fileURLToPath(import.meta.url))

// ── ZK proof imports ──────────────────────────────────────────────────────────
// Loaded lazily to avoid crashing the server if something is missing.
let _zkReady = null  // null=unchecked, true/false after first attempt
let _zkDeps  = null

async function loadZKDeps() {
  if (_zkReady !== null) return _zkReady
  try {
    const ROOT = resolve(__dir, '..')

    // All three WASM modules must use the same shared WASM heap.
    const [runtimeMod, ledgerMod, contractMod] = await Promise.all([
      import(resolve(__dir, 'node_modules/@midnight-ntwrk/compact-runtime/dist/index.js')),
      import(resolve(__dir, 'node_modules/@midnight-ntwrk/ledger-v8/midnight_ledger_wasm_fs.js')),
      import(resolve(ROOT, 'contract/dist/claim_proof/contract/index.js')),
    ])

    const KEYS = resolve(ROOT, 'contract/dist/claim_proof/keys')
    const ZKIR = resolve(ROOT, 'contract/dist/claim_proof/zkir')

    _zkDeps = {
      runtime:  runtimeMod,
      ledger:   ledgerMod,
      Contract: contractMod.Contract,
      claimKeys: {
        proverKey:   readFileSync(resolve(KEYS, 'claim_employment.prover')),
        verifierKey: readFileSync(resolve(KEYS, 'claim_employment.verifier')),
        ir:          readFileSync(resolve(ZKIR,  'claim_employment.bzkir')),
      },
      verifyKeys: {
        proverKey:   readFileSync(resolve(KEYS, 'verify_claim.prover')),
        verifierKey: readFileSync(resolve(KEYS, 'verify_claim.verifier')),
        ir:          readFileSync(resolve(ZKIR,  'verify_claim.bzkir')),
      },
    }
    console.log('[ZK] ✅ Proof dependencies loaded')
    log.info('zk', '✅ Proof dependencies loaded — real ZK mode available')
    _zkReady = true
  } catch (e) {
    console.warn('[ZK] Failed to load proof dependencies:', e.message)
    log.warn('zk', `Proof dependencies missing — running in mock mode. (${e.message})`)
    _zkReady = false
  }
  return _zkReady
}

// ── .env loader ───────────────────────────────────────────────────────────────
try {
  const envPath = resolve(__dir, '.env')
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!(key in process.env)) process.env[key] = val
  }
} catch { /* no .env is fine */ }

const app = express()
app.use(cors())
app.use(express.json())

// ── Request logger middleware ─────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => log.req(req.method, req.path, res.statusCode, Date.now() - start))
  next()
})

// ── Network config ────────────────────────────────────────────────────────────
const MIDNIGHT_ENV = process.env.MIDNIGHT_ENV ?? 'local'
const NETWORK_CONFIGS = {
  local: {
    networkId:   'undeployed',
    indexer:     'http://127.0.0.1:8088/api/v3/graphql',
    indexerWS:   'ws://127.0.0.1:8088/api/v3/graphql/ws',
    node:        'http://127.0.0.1:9944',
    // Proof server runs on 6301 so it doesn't conflict with this service (6300)
    proofServer: 'http://localhost:6301',
  },
  testnet: {
    networkId:   'testnet-02',
    indexer:     'https://indexer.testnet-02.midnight.network/api/v3/graphql',
    indexerWS:   'wss://indexer.testnet-02.midnight.network/api/v3/graphql/ws',
    node:        'wss://rpc.testnet-02.midnight.network',
    proofServer: 'http://localhost:6301',  // always local — privacy requirement
  },
}
const netConfig = NETWORK_CONFIGS[MIDNIGHT_ENV]
setNetworkId(netConfig.networkId)

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const proofServerOk = await checkProofServer()
  const zkReady = await loadZKDeps()
  res.json({
    status: 'ok',
    midnight_env: MIDNIGHT_ENV,
    network_id: netConfig.networkId,
    proof_server: proofServerOk ? 'reachable' : 'unreachable',
    contract_compiled: zkReady,
    zk_mode: zkReady && proofServerOk ? 'real' : 'mock',
  })
})

// ── POST /submit-claim-proof ─────────────────────────────────────────────────
// Invokes the claim_employment ZK circuit.
//
// Body: { claim_id, user_hash, company_hash, claim_hash, timestamp, employment_days }
//   employment_days — PRIVATE witness: proves duration > 0, never committed on-chain
// Returns: { proofBytes (base64), proofHash, mode }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/submit-claim-proof', async (req, res) => {
  const { claim_id, user_hash, company_hash, claim_hash, timestamp, employment_days } = req.body

  if (!claim_id || !user_hash || !company_hash || !claim_hash) {
    return res.status(400).json({ error: 'claim_id, user_hash, company_hash, claim_hash required' })
  }

  // employment_days must be > 0 (enforced by the ZK circuit assertion)
  const empDays = Math.max(1, Number(employment_days) || 30)

  // SHA-256 mock hash used when proof server is unavailable
  const mockHash = crypto
    .createHash('sha256')
    .update(`${user_hash}${company_hash}${claim_id}${claim_hash}${empDays}`)
    .digest('hex')

  // ── Real ZK proof via proof server ────────────────────────────────────────
  const zkReady = await loadZKDeps()
  if (zkReady) {
    try {
      const { runtime, ledger, Contract, claimKeys } = _zkDeps

      const dummyCoinPubKey = { bytes: new Uint8Array(32) }
      const addr = runtime.sampleContractAddress()
      const contract = new Contract({})
      const { currentContractState } = contract.initialState({
        initialZswapLocalState: { coinPublicKey: dummyCoinPubKey },
        initialPrivateState: {},
      })

      const ctx = runtime.createCircuitContext(
        addr,
        dummyCoinPubKey,
        currentContractState.data,
        {}
      )

      // Run claim_employment circuit
      // employment_days is a Uint<32> PRIVATE witness — asserted > 0, never disclosed
      const { proofData } = contract.circuits.claim_employment(
        ctx,
        claim_id,
        user_hash,
        company_hash,
        claim_hash,
        timestamp || new Date().toISOString(),
        BigInt(empDays),
      )

      const preimage = ledger.proofDataIntoSerializedPreimage(
        proofData.input,
        proofData.output,
        proofData.publicTranscript,
        proofData.privateTranscriptOutputs,
        null
      )

      const payload = ledger.createProvingPayload(
        preimage,
        undefined,
        {
          proverKey:   new Uint8Array(claimKeys.proverKey),
          verifierKey: new Uint8Array(claimKeys.verifierKey),
          ir:          new Uint8Array(claimKeys.ir),
        }
      )

      const proofStart = Date.now()
      const proofResp = await fetch(`${netConfig.proofServer}/prove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: payload,
        signal: AbortSignal.timeout(60000),
      })

      if (!proofResp.ok) {
        const errText = await proofResp.text()
        throw new Error(`Proof server ${proofResp.status}: ${errText}`)
      }

      const proofBytes = new Uint8Array(await proofResp.arrayBuffer())
      const proofGeneratedMs = Date.now() - proofStart
      const proofHash = crypto.createHash('sha256').update(proofBytes).digest('hex')

      log.info('zk', `claim_employment real proof ✅  ${proofBytes.length} bytes  ${proofGeneratedMs}ms`)

      return res.json({
        proofHash,
        mode: 'real',
        proofBytes: Buffer.from(proofBytes).toString('base64'),
        proofSizeBytes: proofBytes.length,
        proofGeneratedMs,
      })
    } catch (err) {
      log.warn('zk', `Real claim_employment proof failed, falling back to mock: ${err.message}`)
    }
  }

  // ── Fallback: SHA-256 mock proof ──────────────────────────────────────────
  log.info('zk', `claim_employment mock proof  hash=${mockHash.slice(0,16)}…`)
  return res.json({ proofHash: mockHash, mode: 'mock' })
})

// ── POST /submit-verify-proof ─────────────────────────────────────────────────
// Invokes the verify_claim ZK circuit.
//
// Body: { claim_id, verifier_hash, verification_type, claim_hash }
// Returns: { proofBytes (base64), proofHash, mode }
// ─────────────────────────────────────────────────────────────────────────────
app.post('/submit-verify-proof', async (req, res) => {
  const { claim_id, verifier_hash, verification_type, claim_hash } = req.body

  if (!claim_id || !verifier_hash || !claim_hash) {
    return res.status(400).json({ error: 'claim_id, verifier_hash, claim_hash required' })
  }

  const mockHash = crypto
    .createHash('sha256')
    .update(`${claim_id}${verifier_hash}${claim_hash}${verification_type || ''}VERIFY_ZK`)
    .digest('hex')

  // ── Real ZK proof via proof server ────────────────────────────────────────
  const zkReady = await loadZKDeps()
  if (zkReady) {
    try {
      const { runtime, ledger, Contract, verifyKeys } = _zkDeps

      const dummyCoinPubKey = { bytes: new Uint8Array(32) }
      const addr = runtime.sampleContractAddress()
      const contract = new Contract({})
      const { currentContractState } = contract.initialState({
        initialZswapLocalState: { coinPublicKey: dummyCoinPubKey },
        initialPrivateState: {},
      })

      const ctx = runtime.createCircuitContext(
        addr,
        dummyCoinPubKey,
        currentContractState.data,
        {}
      )

      const vp_hash = crypto.createHash('sha256')
        .update(`${verifier_hash}${claim_hash}${verification_type || ''}`)
        .digest('hex')

      const { proofData } = contract.circuits.verify_claim(
        ctx,
        claim_id,
        verifier_hash,
        claim_hash,
        verification_type || 'manual',
        vp_hash,
      )

      const preimage = ledger.proofDataIntoSerializedPreimage(
        proofData.input,
        proofData.output,
        proofData.publicTranscript,
        proofData.privateTranscriptOutputs,
        null
      )

      const payload = ledger.createProvingPayload(
        preimage,
        undefined,
        {
          proverKey:   new Uint8Array(verifyKeys.proverKey),
          verifierKey: new Uint8Array(verifyKeys.verifierKey),
          ir:          new Uint8Array(verifyKeys.ir),
        }
      )

      const proofStart = Date.now()
      const proofResp = await fetch(`${netConfig.proofServer}/prove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: payload,
        signal: AbortSignal.timeout(60000),
      })

      if (!proofResp.ok) {
        const errText = await proofResp.text()
        throw new Error(`Proof server ${proofResp.status}: ${errText}`)
      }

      const proofBytes = new Uint8Array(await proofResp.arrayBuffer())
      const proofGeneratedMs = Date.now() - proofStart
      const proofHash = crypto.createHash('sha256').update(proofBytes).digest('hex')

      log.info('zk', `verify_claim real proof ✅  ${proofBytes.length} bytes  ${proofGeneratedMs}ms`)

      return res.json({
        proofHash,
        mode: 'real',
        proofBytes: Buffer.from(proofBytes).toString('base64'),
        proofSizeBytes: proofBytes.length,
        proofGeneratedMs,
      })
    } catch (err) {
      log.warn('zk', `Real verify_claim proof failed, falling back to mock: ${err.message}`)
    }
  }

  // ── Fallback: SHA-256 mock proof ──────────────────────────────────────────
  log.info('zk', `verify_claim mock proof  hash=${mockHash.slice(0,16)}…`)
  return res.json({ proofHash: mockHash, mode: 'mock' })
})

// ─────────────────────────────────────────────────────────────────────────────
async function checkProofServer() {
  try {
    const r = await fetch(`${netConfig.proofServer}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    return r.ok
  } catch {
    return false
  }
}

const PORT = process.env.PORT ?? 6300
app.listen(PORT, async () => {
  const zkReady = await loadZKDeps()
  const zkMode  = zkReady ? 'real' : 'mock'
  console.log('')
  log.info('midnight', `${C.bold}WorkProof Midnight Service started${C.reset}`)
  log.info('midnight', `Listening on   http://localhost:${PORT}`)
  log.info('midnight', `Network env    ${MIDNIGHT_ENV}  (${netConfig.networkId})`)
  log.info('midnight', `ZK mode        ${zkMode === 'real' ? C.green + 'real' + C.reset : C.yellow + 'mock (no compiled contract)' + C.reset}`)
  log.info('midnight', `Proof server   ${netConfig.proofServer}`)
  console.log('')
})
