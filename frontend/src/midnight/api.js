// ─── WorkProof Contract API (browser layer) ─────────────────────────────────
// The browser cannot run the Midnight SDK directly (WASM + Node.js deps),
// so this module calls the midnight-service (Node.js, port 6300) for health
// checks and wallet-side operations.
//
// Note: Claim and verification proof submission goes through the Python backend,
// not directly through midnight-service from the browser.
// ─────────────────────────────────────────────────────────────────────────────

const MIDNIGHT_SERVICE = import.meta.env.VITE_MIDNIGHT_SERVICE_URL ?? 'http://localhost:6300'

/**
 * Check if the Midnight service (and by extension the proof server) is reachable.
 * @returns {Promise<{ serviceUp: boolean, proofServerUp: boolean, contractCompiled: boolean, networkId: string|null, zkMode: string }>}
 */
export async function checkMidnightService() {
  try {
    const res = await fetch(`${MIDNIGHT_SERVICE}/health`, {
      signal: AbortSignal.timeout(2000),
    })
    if (!res.ok) return { serviceUp: false, proofServerUp: false, contractCompiled: false, networkId: null, zkMode: 'mock' }
    const data = await res.json()
    return {
      serviceUp: true,
      proofServerUp: data.proof_server === 'reachable',
      contractCompiled: data.contract_compiled ?? false,
      networkId: data.network_id ?? null,
      zkMode: data.zk_mode ?? 'mock',
    }
  } catch {
    return { serviceUp: false, proofServerUp: false, contractCompiled: false, networkId: null, zkMode: 'mock' }
  }
}
