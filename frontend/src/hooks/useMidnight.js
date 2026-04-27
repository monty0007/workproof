// ─── useMidnight ──────────────────────────────────────────────────────────────
// Central React hook for all Midnight Network interactions.
//
// Exposes:
//   walletStatus  — 'disconnected' | 'connecting' | 'connected' | 'error'
//   walletAddress — shortened Midnight address (or null)
//   proofServer   — { reachable: bool }
//   connect()     — trigger Lace wallet connection popup
//   submitProof() — run ZK proof generation + on-chain submission
//   zkMode        — 'real' | 'mock'  (what the last proof used)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from 'react'
import { isLaceInstalled, connectLaceWallet, getWalletAddress } from '../midnight/wallet.js'
import { checkMidnightService } from '../midnight/api.js'

const WALLET_KEY = 'wp_wallet_connected'

export function useMidnight() {
  const [walletStatus, setWalletStatus] = useState('disconnected')
  const [walletAddress, setWalletAddress] = useState(null)
  const [walletError, setWalletError]   = useState(null)
  const [walletDemo, setWalletDemo]     = useState(false)
  const [serviceStatus, setServiceStatus] = useState({
    serviceUp: false, proofServerUp: false, contractCompiled: false, networkId: null, zkMode: 'mock',
  })
  const [zkMode, setZkMode] = useState(null) // 'real' | 'mock'
  const walletApiRef = useRef(null)

  // Poll midnight-service health every 10s
  useEffect(() => {
    let alive = true
    async function poll() {
      const status = await checkMidnightService()
      if (alive) setServiceStatus(status)
    }
    poll()
    const t = setInterval(poll, 10_000)
    return () => { alive = false; clearInterval(t) }
  }, [])

  // ── Auto-reconnect on page load if previously connected ──────────────────
  useEffect(() => {
    if (localStorage.getItem(WALLET_KEY) !== '1') return
    let cancelled = false
    ;(async () => {
      try {
        setWalletStatus('connecting')
        const api = await connectLaceWallet()
        if (cancelled) return
        walletApiRef.current = api
        const addr = await getWalletAddress(api)
        if (cancelled) return
        setWalletAddress(addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : 'Connected')
        setWalletStatus('connected')
        setWalletDemo(api._demo === true)
      } catch {
        if (!cancelled) {
          // Silent fail — just show disconnected, don't block the UI
          setWalletStatus('disconnected')
          localStorage.removeItem(WALLET_KEY)
        }
      }
    })()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useCallback(async () => {
    setWalletStatus('connecting')
    setWalletError(null)
    try {
      const api = await connectLaceWallet()
      walletApiRef.current = api
      const addr = await getWalletAddress(api)
      setWalletAddress(addr ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : 'Connected')
      setWalletStatus('connected')
      setWalletDemo(api._demo === true)
      localStorage.setItem(WALLET_KEY, '1')  // persist so we can auto-reconnect next load
    } catch (err) {
      setWalletError(err.message)
      setWalletStatus('error')
      localStorage.removeItem(WALLET_KEY)
    }
  }, [])

  /**
   * Generate a ZK proof and submit on-chain.
   * In WorkProof, proofs are submitted via the Python backend → midnight-service.
   * This callback is kept for future direct wallet-to-contract interactions.
   */
  const submitProof = useCallback(async (proofData) => {
    setZkMode(proofData?.mode ?? 'mock')
    return proofData
  }, [])

  return {
    // Wallet
    walletStatus,
    walletAddress,
    walletError,
    walletDemo,
    isLaceInstalled: isLaceInstalled(),
    connect,
    // Midnight service + proof server
    serviceUp: serviceStatus.serviceUp,
    proofServerUp: serviceStatus.proofServerUp,
    contractCompiled: serviceStatus.contractCompiled,
    networkId: serviceStatus.networkId,
    serviceZkMode: serviceStatus.zkMode,
    // ZK submission
    submitProof,
    zkMode,
    // Derived convenience flag
    isFullyConnected: walletStatus === 'connected' && serviceStatus.serviceUp,
  }
}
