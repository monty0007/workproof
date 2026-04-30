import { useEffect, useState } from 'react'

const VERIFY_TYPES = [
  { id: 'email_domain', icon: 'mail',           label: 'Email Domain', body: 'Confirm via a matching company email domain. +30 trust.' },
  { id: 'linkedin',     icon: 'link',           label: 'LinkedIn',     body: 'Match against the candidate’s public LinkedIn profile. +25 trust.' },
  { id: 'document',     icon: 'description',    label: 'Document',     body: 'Upload supporting documentation hash. +20 trust.' },
  { id: 'manual',       icon: 'fact_check',     label: 'Manual',       body: 'Recruiter or HR co-sign — peer endorsement. +15 trust.' },
]

const SCORE_DELTA = { email_domain: 30, linkedin: 25, document: 20, manual: 15 }

export default function VerificationView({ setCurrentTab, initialQuery, onQueryConsumed }) {
  const [lookupId,  setLookupId]  = useState('')
  const [claim,     setClaim]     = useState(null)
  const [vType,     setVType]     = useState('email_domain')
  const [domain,    setDomain]    = useState('')
  const [linkedin,  setLinkedin]  = useState('')
  const [docHash,   setDocHash]   = useState('')
  const [note,      setNote]      = useState('')
  const [verifier,  setVerifier]  = useState('')
  const [busy,      setBusy]      = useState(false)
  const [error,     setError]     = useState(null)
  const [success,   setSuccess]   = useState(null)
  const [log,       setLog]       = useState([])
  const [allClaims, setAllClaims] = useState([])

  useEffect(() => { loadLog(); loadClaims() }, [])

  useEffect(() => {
    if (initialQuery) {
      setLookupId(initialQuery)
      lookupClaim(initialQuery)
      onQueryConsumed?.('')
    }
  }, [initialQuery])

  async function lookupClaim(value = lookupId) {
    if (!value.trim()) return
    setBusy(true); setError(null); setClaim(null); setSuccess(null)
    try {
      const r = await fetch(`/api/audit/${value.trim()}`)
      if (!r.ok) throw new Error(r.status === 404 ? 'Claim not found' : `Error ${r.status}`)
      setClaim(await r.json())
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  // Refresh claim data silently (after verification) — keeps UI state intact
  async function refreshClaim(claimId) {
    try {
      const r = await fetch(`/api/audit/${claimId}`)
      if (r.ok) setClaim(await r.json())
    } catch { /* ignore */ }
  }

  async function loadLog() {
    try {
      const r = await fetch('/api/audit/log')
      if (r.ok) {
        const d = await r.json()
        const entries = Array.isArray(d) ? d : (d.log || d.entries || [])
        setLog(entries.slice(0, 12))
      }
    } catch { /* ignore */ }
  }

  async function loadClaims() {
    try {
      const r = await fetch('/api/claims')
      if (r.ok) {
        const d = await r.json()
        const list = Array.isArray(d) ? d : (d.claims || [])
        setAllClaims(list)
      }
    } catch { /* ignore */ }
  }

  async function submitVerification() {
    if (!claim) return
    setBusy(true); setError(null); setSuccess(null)
    try {
      const payload = {
        claim_id:              claim.claim_id,
        verification_type:     vType,
        verifier_email:        verifier.trim() || 'anonymous@workproof.demo',
        company_email_domain:  vType === 'email_domain' ? domain.trim() || undefined : undefined,
        linkedin_match:        vType === 'linkedin' ? !!linkedin.trim() : undefined,
        endorsements:          vType === 'manual' ? 1 : 0,
      }
      const r = await fetch('/api/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.detail || `Error ${r.status}`) }
      const d = await r.json()
      setSuccess(d)
      refreshClaim(claim.claim_id)
      loadLog()
      loadClaims()
    } catch (e) { setError(e.message) }
    finally { setBusy(false) }
  }

  const delta = SCORE_DELTA[vType] || 0
  const projected = claim ? Math.min(100, (claim.trust_score || 0) + delta) : 0

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <section className="cp-fluid pt-8 lg:pt-10">
        <div className="hero-panel p-6 lg:p-8">
          <div className="flex items-start lg:items-center gap-4 flex-wrap">
            <div
              className="flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ width: 52, height: 52, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.35)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--indigo)', fontSize: 26, fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow mb-1">Verification portal</p>
              <h1 className="headline font-black text-2xl lg:text-3xl">Add a signal to a claim</h1>
              <p className="text-sm mt-1.5" style={{ color: 'var(--ink-3)' }}>
                Look up an existing claim, choose a signal type, and submit verifiable evidence. Each signal updates the trust score deterministically.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-mint">Append-only log</span>
              <span className="badge badge-indigo">Multi-signal</span>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="cp-fluid py-8 lg:py-10 flex-1">
        <div className="grid gap-5 xl:grid-cols-[1fr_400px] items-start">
          <div className="space-y-5">

            {/* STEP 1 — lookup */}
            <div className="card p-7">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                     style={{ width: 32, height: 32, background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)', color: 'var(--mint-2)', fontWeight: 700 }}>1</div>
                <h3 className="headline font-bold text-lg">Look up the claim</h3>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  className="input flex-1 mono text-xs"
                  placeholder="Paste claim ID (e.g. clm_a3f9...)"
                  value={lookupId}
                  onChange={e => setLookupId(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && lookupClaim()} />
                <button onClick={() => lookupClaim()} disabled={busy || !lookupId.trim()} className="btn btn-primary">
                  {busy && !claim
                    ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>Looking up…</>
                    : <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>Look up</>
                  }
                </button>
              </div>

              {claim && (
                <div className="mt-5 grid sm:grid-cols-3 gap-3">
                  <div className="surface-soft p-4">
                    <p className="eyebrow mb-1">Role</p>
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink-1)' }}>{claim.role || '—'}</p>
                  </div>
                  <div className="surface-soft p-4">
                    <p className="eyebrow mb-1">Current score</p>
                    <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--mint-2)' }}>{claim.trust_score}</p>
                  </div>
                  <div className="surface-soft p-4">
                    <p className="eyebrow mb-1">Signals</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>
                      {claim.verifications?.length || 0} attached
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2 — signal */}
            {claim && (
              <div className="card p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center rounded-lg flex-shrink-0"
                       style={{ width: 32, height: 32, background: 'rgba(99,102,241,0.14)', border: '1px solid rgba(99,102,241,0.35)', color: 'var(--indigo)', fontWeight: 700 }}>2</div>
                  <h3 className="headline font-bold text-lg">Choose a signal type</h3>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-6">
                  {VERIFY_TYPES.map(t => {
                    const active = vType === t.id
                    return (
                      <button
                        key={t.id}
                        onClick={() => setVType(t.id)}
                        className="text-left p-4 rounded-xl transition-all"
                        style={{
                          background: active ? 'rgba(45,212,191,0.08)' : 'var(--surface-3)',
                          border: `1px solid ${active ? 'var(--mint)' : 'var(--line-1)'}`,
                          boxShadow: active ? '0 0 0 3px rgba(45,212,191,0.12)' : 'none',
                        }}>
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className="material-symbols-outlined" style={{ color: active ? 'var(--mint-2)' : 'var(--ink-3)', fontSize: 20, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>{t.icon}</span>
                          <p className="text-sm font-bold" style={{ color: 'var(--ink-1)' }}>{t.label}</p>
                          <span className="ml-auto mono text-xs font-bold" style={{ color: 'var(--mint-2)' }}>+{SCORE_DELTA[t.id]}</span>
                        </div>
                        <p className="text-xs leading-relaxed" style={{ color: 'var(--ink-4)' }}>{t.body}</p>
                      </button>
                    )
                  })}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div>
                    <label className="label">Verifier email</label>
                    <input className="input" placeholder="hr@company.com"
                           value={verifier} onChange={e => setVerifier(e.target.value)} />
                  </div>

                  {vType === 'email_domain' && (
                    <div>
                      <label className="label">Email domain</label>
                      <input className="input" placeholder="company.com"
                             value={domain} onChange={e => setDomain(e.target.value)} />
                    </div>
                  )}
                  {vType === 'linkedin' && (
                    <div>
                      <label className="label">LinkedIn URL</label>
                      <input className="input" placeholder="https://linkedin.com/in/…"
                             value={linkedin} onChange={e => setLinkedin(e.target.value)} />
                    </div>
                  )}
                  {vType === 'document' && (
                    <div>
                      <label className="label">Document hash (SHA-256)</label>
                      <input className="input mono text-xs" placeholder="0x…"
                             value={docHash} onChange={e => setDocHash(e.target.value)} />
                    </div>
                  )}
                  {vType === 'manual' && (
                    <div className="lg:col-span-2">
                      <label className="label">Endorsement note</label>
                      <input className="input" placeholder="I worked with this person on…"
                             value={note} onChange={e => setNote(e.target.value)} />
                    </div>
                  )}
                </div>

                {/* Score impact preview */}
                <div className="mt-6 rounded-xl p-5"
                     style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.10), rgba(99,102,241,0.06))', border: '1px solid rgba(45,212,191,0.25)' }}>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <p className="eyebrow mb-1">Projected impact</p>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold tabular-nums" style={{ color: 'var(--ink-2)' }}>{claim.trust_score}</span>
                        <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)' }}>arrow_forward</span>
                        <span className="text-3xl font-black tabular-nums" style={{ color: 'var(--mint-2)' }}>{projected}</span>
                      </div>
                    </div>
                    <div className="flex-1" />
                    <span className="badge badge-mint">+{delta} points</span>
                  </div>
                </div>

                {error && (
                  <div className="mt-4 px-4 py-3 rounded-xl flex items-center gap-3"
                       style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--rose-2)' }}>error</span>
                    <p className="text-sm" style={{ color: 'var(--rose-2)' }}>{error}</p>
                  </div>
                )}

                {success && (
                  <div className="mt-4 px-4 py-3 rounded-xl flex items-center gap-3"
                       style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    <div className="text-sm" style={{ color: 'var(--success)' }}>
                      Signal added — new trust score: <strong>{success.trust_score}</strong>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={submitVerification} disabled={busy} className="btn btn-primary btn-lg">
                    {busy
                      ? <><span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>Submitting…</>
                      : <><span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>verified</span>Submit Signal</>
                    }
                  </button>
                  <button onClick={() => setCurrentTab('recruiter')} className="btn btn-ghost btn-lg">
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                    Back to discover
                  </button>
                </div>
              </div>
            )}

            {!claim && !busy && (
              <div className="card p-12 text-center">
                <div className="mx-auto mb-5 flex items-center justify-center rounded-2xl"
                     style={{ width: 64, height: 64, background: 'var(--surface-3)', border: '1px solid var(--line-2)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--ink-4)', fontSize: 32 }}>search</span>
                </div>
                <h3 className="headline font-bold text-xl mb-2">Pick a claim to begin</h3>
                <p className="text-sm" style={{ color: 'var(--ink-4)' }}>
                  Click any claim from <em>Recent claims</em> on the right, paste a claim ID above, or use <em>Send to Verification</em> from the recruiter portal.
                </p>
              </div>
            )}
          </div>

          {/* Side rail */}
          <aside className="space-y-5 xl:sticky xl:top-24">
            {/* Recent claims picker */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">Recent claims</p>
                <button onClick={loadClaims} className="btn btn-ghost btn-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
                </button>
              </div>
              <p className="text-xs mb-3" style={{ color: 'var(--ink-4)' }}>
                Click any claim to load it for verification.
              </p>
              {allClaims.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No claims submitted yet.</p>
              )}
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {allClaims.slice(0, 10).map(c => {
                  const sc = c.trust_score >= 70 ? 'var(--success)' : c.trust_score >= 40 ? 'var(--warning)' : 'var(--danger)'
                  const isActive = claim?.claim_id === c.claim_id
                  return (
                    <button
                      key={c.claim_id}
                      onClick={() => { setLookupId(c.claim_id); lookupClaim(c.claim_id) }}
                      className="w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3"
                      style={{
                        background: isActive ? 'rgba(45,212,191,0.10)' : 'var(--surface-3)',
                        border: `1px solid ${isActive ? 'var(--mint)' : 'var(--line-1)'}`,
                      }}>
                      <div
                        className="flex items-center justify-center rounded-md flex-shrink-0 mono text-[11px] font-bold tabular-nums"
                        style={{ width: 32, height: 32, background: `${sc}1c`, color: sc, border: `1px solid ${sc}55` }}>
                        {c.trust_score}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate" style={{ color: 'var(--ink-1)' }}>{c.role || 'Untitled role'}</p>
                        <p className="hash mt-0.5 truncate" style={{ fontSize: 10 }}>{c.claim_id?.slice(0, 18)}…</p>
                      </div>
                      {c.verified > 0 && (
                        <span className="badge badge-mint" style={{ fontSize: 9, padding: '2px 6px' }}>{c.verified}</span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Audit log */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="eyebrow">Recent audit log</p>
                <button onClick={loadLog} className="btn btn-ghost btn-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>refresh</span>
                </button>
              </div>
              {log.length === 0 && (
                <p className="text-sm" style={{ color: 'var(--ink-4)' }}>No verifications yet.</p>
              )}
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {log.map((e, i) => (
                  <div key={i} className="px-3 py-2.5 rounded-lg"
                       style={{ background: 'var(--surface-3)', border: '1px solid var(--line-1)' }}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: 'var(--mint-2)' }}>
                        {(e.event_type || e.verification_type || e.action || 'event').replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px]" style={{ color: 'var(--ink-5)' }}>
                        {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p className="hash truncate">{e.claim_id || e.proof_hash || '—'}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <p className="eyebrow mb-3">Signal cheat sheet</p>
              <div className="space-y-2 text-sm">
                {VERIFY_TYPES.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                       style={{ background: 'var(--surface-3)', border: '1px solid var(--line-1)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)', fontSize: 18 }}>{t.icon}</span>
                    <span style={{ color: 'var(--ink-2)' }} className="flex-1">{t.label}</span>
                    <span className="mono font-bold text-xs" style={{ color: 'var(--mint-2)' }}>+{SCORE_DELTA[t.id]}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
