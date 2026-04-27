// ─── Midnight Wallet Connector ────────────────────────────────────────────────
// Connects to the Lace browser wallet extension via the DApp Connector API.
// Reference: @midnight-ntwrk/dapp-connector-api
//
// window.midnight is a Record<string, InitialAPI> — the key is wallet-defined.
// We find Lace by checking rdns or name, then call .connect(networkId).
// ─────────────────────────────────────────────────────────────────────────────

const NETWORK_ID = 'preprod'   // matches Lace preprod config

/**
 * Wait up to `ms` milliseconds for any Midnight wallet to inject into window.midnight.
 */
async function waitForWallet(ms = 3000) {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    const api = findLaceAPI()
    if (api) return api
    await new Promise(r => setTimeout(r, 100))
  }
  return null
}

/**
 * Find the Lace wallet InitialAPI from window.midnight.
 * Matches on rdns containing 'lace' or name containing 'lace' (case-insensitive).
 * Falls back to the first wallet found if only one is present.
 */
function findLaceAPI() {
  if (typeof window === 'undefined' || !window.midnight) return null
  const entries = Object.values(window.midnight)
  if (!entries.length) return null
  const lace = entries.find(w =>
    w?.rdns?.toLowerCase().includes('lace') ||
    w?.name?.toLowerCase().includes('lace')
  )
  return lace ?? entries[0]  // if only one wallet, use it regardless of name
}

/**
 * Check whether any Midnight wallet extension is installed.
 * @returns {boolean}
 */
export function isLaceInstalled() {
  return findLaceAPI() != null
}

/**
 * Connect to the Lace wallet via Midnight DApp Connector API.
 * Waits up to 3s for the extension to inject, then falls back to demo mode.
 *
 * @returns {Promise<object>} ConnectedAPI or demo object
 */
export async function connectLaceWallet() {
  const walletAPI = await waitForWallet(3000)

  if (!walletAPI) {
    if (typeof window !== 'undefined' && window.midnight) {
      console.warn('[Wallet] window.midnight present but no wallet found. Keys:',
        Object.keys(window.midnight))
    } else {
      console.warn('[Wallet] No Midnight wallet extension found — using demo mode.')
    }
    return makeDemoWallet()
  }

  try {
    console.log(`[Wallet] Connecting to: ${walletAPI.name} (${walletAPI.rdns})`)
    const api = await walletAPI.connect(NETWORK_ID)
    return api
  } catch (err) {
    console.warn('[Wallet] Wallet connection rejected or failed:', err.message)
    throw err
  }
}

/**
 * Fetch the user's Midnight address from the connected wallet.
 * @param {object} walletApi — returned by connectLaceWallet()
 * @returns {Promise<string>}
 */
export async function getWalletAddress(walletApi) {
  if (walletApi._demo) {
    return walletApi._address
  }
  // ConnectedAPI: getUsedAddresses() or state().coinPublicKey
  if (typeof walletApi.getUsedAddresses === 'function') {
    const addresses = await walletApi.getUsedAddresses()
    return addresses?.[0] ?? null
  }
  // Some versions expose state directly
  if (typeof walletApi.state === 'function') {
    const state = await walletApi.state()
    return state?.address ?? state?.coinPublicKey ?? null
  }
  return null
}

function makeDemoWallet() {
  const addr = 'mn1demo' + Math.random().toString(36).slice(2, 10).padEnd(8, '0') + 'workproof'
  return {
    _demo: true,
    _address: addr,
    getUsedAddresses: async () => [addr],
  }
}
