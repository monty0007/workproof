import { useEffect, useState } from 'react'

const SCORE_COLOR = s => s >= 70 ? 'var(--success)' : s >= 40 ? 'var(--warning)' : 'var(--danger)'
const SCORE_LABEL = s => s >= 70 ? 'High Confidence'  : s >= 40 ? 'Medium Confidence' : 'Low Confidence'
const CONF_BADGE  = s => s >= 70 ? 'badge-mint'       : s >= 40 ? 'badge-amber'       : 'badge-rose'

const CONTRACT_SNIPPET = `// Compact ZK contract — claim_proof.compact

circuit claim_employment(
  user_email_hash: Field,
  company_hash:    Field,
  role:            Bytes32,
  start_date:      U32,
  end_date:        U32,
) -> Proof {
  assert end_date >= start_date;
  let commitment = poseidon(
    [user_email_hash, company_hash, role, start_date, end_date]
  );
  ledger.append(commitment);
  return Proof(commitment);
}`

function Syntax({ code }) {
  // tiny token highlighter — strings, keywords, types, comments
  const html = code
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/(\/\/.*)/g,                       '<span style="color:#475569">$1</span>')
    .replace(/\b(circuit|let|return|assert)\b/g,'<span style="color:#5eead4;font-weight:600">$1</span>')
    .replace(/\b(Field|Bytes32|U32|Proof)\b/g,  '<span style="color:#fbbf24">$1</span>')
    .replace(/\b(poseidon|ledger\.append)\b/g,  '<span style="color:#a5b4fc">$1</span>')
  return <pre className="mono text-xs leading-relaxed overflow-x-auto" style={{ color: 'var(--ink-2)' }}
              dangerouslySetInnerHTML={{ __html: html }} />
}

export default function RecruiterView({ setCurrentTab, goVerify }) {
  const [claims,    setClaims]    = useState([])
  const [selected,  setSelected]  = useState(null)
  const [audit,     setAudit]     = useState(null)
  const [loading,   setLoading]   = useState(false)
  const [inspecting,setInspecting]= useState(false)
  const [error,     setError]     = useState(null)
  const [search,    setSearch]    = useState('')
  const [toast,     setToast]     = useState('')

  async function loadClaims() {
    setLoading(true); setError(null)
    try {
      const r = await fetch('/api/claims')
      if (!r.ok) throw new Error(`Error ${r.status}`)
      const d = await r.json()
      setClaims(Array.isArray(d) ? d : (d.claims || []))
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function inspectClaim(c) {
    setSelected(c); setAudit(null); setInspecting(true); setError(null)
    try {
      const r = await fetch(`/api/audit/${c.claim_id}`)
      if (!r.ok) throw new Error(`Error ${r.status}`)
      setAudit(await r.json())
    } catch (e) { setError(e.message) }
    finally { setInspecting(false) }
  }

  function copy(text, label) {
    navigator.clipboard.writeText(text)
    setToast(`${label} copied`)
    setTimeout(() => setToast(''), 1800)
  }

  useEffect(() => { loadClaims() }, [])

  const filtered = claims.filter(c => {
    if (!search.trim()) return true
    const s = search.toLowerCase()
    return (c.role || '').toLowerCase().includes(s) ||
           (c.claim_id || '').toLowerCase().includes(s)
  })

  return (
    <div className="flex-1 flex flex-col">
      {toast && (
        <div className="fixed top-20 right-6 z-50 px-4 py-2.5 rounded-xl flex items-center gap-2 animate-fadeIn"
             style={{ background: 'var(--surface-3)', border: '1px solid var(--mint)', color: 'var(--mint-2)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Header */}
      <section className="cp-fluid pt-8 lg:pt-10">
        <div className="hero-panel p-6 lg:p-8">
          <div className="flex items-start lg:items-center gap-4 flex-wrap">
            <div
              className="flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ width: 52, height: 52, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--amber-2)', fontSize: 26, fontVariationSettings: "'FILL' 1" }}>person_search</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow mb-1">Recruiter dashboard</p>
              <h1 className="headline font-black text-2xl lg:text-3xl">Discover &amp; inspect proofs</h1>
              <p className="text-sm mt-1.5" style={{ color: 'var(--ink-3)' }}>
                Browse all employment claims, inspect their cryptographic evidence, and hand off to verification.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="stat" style={{ minWidth: 110 }}>
                <div className="stat-value text-2xl">{claims.length}</div>
                <div className="stat-label">Total claims</div>
              </div>
              <button onClick={loadClaims} disabled={loading} className="btn btn-ghost">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                {loading ? 'Loading…' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Body — 3 columns on wide */}
      <section className="cp-fluid py-8 lg:py-10 flex-1">
        <div className="grid gap-5 xl:grid-cols-[360px_1fr_380px] items-start">

          {/* COL 1 — claims list */}
          <div className="card p-0 overflow-hidden">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between">
              <p className="eyebrow">Claims</p>
              <span className="text-xs" style={{ color: 'var(--ink-4)' }}>{filtered.length} shown</span>
            </div>
            <div className="px-5 pb-3">
              <input
                className="input"
                placeholder="Search role or claim ID…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="divider-soft mb-1" />
            <div className="max-h-[640px] overflow-y-auto">
              {loading && (
                <div className="px-5 py-6 text-sm flex items-center gap-2" style={{ color: 'var(--ink-4)' }}>
                  <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
                  Loading claims…
                </div>
              )}
              {!loading && filtered.length === 0 && (
                <div className="px-5 py-10 text-center text-sm" style={{ color: 'var(--ink-4)' }}>
                  No claims yet. Submit one from the My Claims tab.
                </div>
              )}
              {filtered.map(c => {
                const active = selected?.claim_id === c.claim_id
                const sc = SCORE_COLOR(c.trust_score)
                return (
                  <button
                    key={c.claim_id}
                    onClick={() => inspectClaim(c)}
                    className="w-full text-left px-5 py-3.5 transition-colors flex items-center gap-3"
                    style={{
                      background: active ? 'rgba(45,212,191,0.07)' : 'transparent',
                      borderLeft: active ? '3px solid var(--mint)' : '3px solid transparent',
                    }}>
                    <div
                      className="flex items-center justify-center rounded-lg flex-shrink-0 mono text-xs font-bold tabular-nums"
                      style={{ width: 38, height: 38, background: `${sc}1c`, color: sc, border: `1px solid ${sc}55` }}>
                      {c.trust_score}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink-1)' }}>{c.role || 'Untitled role'}</p>
                      <p className="hash mt-0.5">{c.claim_id?.slice(0, 14)}…</p>
                    </div>
                    {c.flags?.length > 0 && (
                      <span className="badge badge-amber" style={{ fontSize: 9, padding: '2px 6px' }}>{c.flags.length}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* COL 2 — detail */}
          <div className="space-y-5">
            {!selected && (
              <div className="card p-12 text-center">
                <div
                  className="mx-auto mb-5 flex items-center justify-center rounded-2xl"
                  style={{ width: 64, height: 64, background: 'var(--surface-3)', border: '1px solid var(--line-2)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--ink-4)', fontSize: 32 }}>fact_check</span>
                </div>
                <h3 className="headline font-bold text-xl mb-2">Select a claim to inspect</h3>
                <p className="text-sm" style={{ color: 'var(--ink-4)' }}>
                  Pick a claim from the list to view its proof, trust score, and audit evidence.
                </p>
              </div>
            )}

            {selected && (
              <>
                <div className="card p-7">
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div className="min-w-0">
                      <p className="eyebrow mb-1">Selected claim</p>
                      <h2 className="headline font-bold text-2xl truncate">{selected.role || 'Untitled role'}</h2>
                      <p className="hash mt-2">{selected.claim_id}</p>
                    </div>
                    <button onClick={() => copy(selected.claim_id, 'Claim ID')} className="btn btn-ghost btn-sm flex-shrink-0">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>content_copy</span>
                      Copy ID
                    </button>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div className="stat">
                      <div className="stat-value text-3xl tabular-nums" style={{ color: SCORE_COLOR(selected.trust_score) }}>
                        {selected.trust_score}
                      </div>
                      <div className="stat-label">Trust score</div>
                    </div>
                    <div className="surface-soft p-4">
                      <p className="eyebrow mb-1">Confidence</p>
                      <span className={`badge ${CONF_BADGE(selected.trust_score)}`}>{SCORE_LABEL(selected.trust_score)}</span>
                    </div>
                    <div className="surface-soft p-4">
                      <p className="eyebrow mb-1">Status</p>
                      <span className="badge badge-mint">
                        <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>verified</span>
                        Committed
                      </span>
                    </div>
                  </div>
                </div>

                {inspecting && (
                  <div className="card p-6 flex items-center gap-3" style={{ color: 'var(--ink-3)' }}>
                    <span className="material-symbols-outlined animate-spin" style={{ color: 'var(--mint-2)' }}>progress_activity</span>
                    <span className="text-sm">Running audit inspection…</span>
                  </div>
                )}

                {audit && (
                  <div className="card p-7">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <p className="eyebrow mb-1">Audit evidence</p>
                        <h3 className="headline font-bold text-lg">Proof breakdown</h3>
                      </div>
                      <span className={`badge ${audit.zk_mode === 'real' ? 'badge-mint' : 'badge-slate'}`}>
                        {audit.zk_mode === 'real' ? '⚡ ZK Real' : '● ZK Mock'}
                      </span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 mb-5">
                      <div className="surface-soft p-4">
                        <p className="eyebrow mb-1.5">Proof hash</p>
                        <p className="hash break-all">{audit.proof_hash}</p>
                      </div>
                      <div className="surface-soft p-4">
                        <p className="eyebrow mb-1.5">Verification trail</p>
                        <p className="text-sm" style={{ color: 'var(--ink-1)' }}>
                          {audit.verifications?.length || 0} signal{audit.verifications?.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    {audit.flags?.length > 0 && (
                      <div className="mb-5">
                        <p className="eyebrow mb-2">AI flags</p>
                        <div className="flex flex-wrap gap-2">
                          {audit.flags.map(f => <span key={f} className="badge badge-amber">{f.replace(/_/g, ' ')}</span>)}
                        </div>
                      </div>
                    )}

                    {audit.verifications?.length > 0 && (
                      <div>
                        <p className="eyebrow mb-2">Signals</p>
                        <div className="space-y-2">
                          {audit.verifications.map((v, i) => (
                            <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                                 style={{ background: 'var(--surface-3)', border: '1px solid var(--line-1)' }}>
                              <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>verified</span>
                              <span className="text-sm flex-1" style={{ color: 'var(--ink-1)' }}>{v.verification_type?.replace(/_/g, ' ') || 'signal'}</span>
                              <span className="hash">{v.verifier?.slice(0, 16) || 'system'}…</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="divider my-5" />
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => goVerify(selected.claim_id)} className="btn btn-primary">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                        Send to Verification
                      </button>
                      <button onClick={() => copy(audit.proof_hash, 'Proof hash')} className="btn btn-ghost">
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                        Copy proof hash
                      </button>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="card p-5 flex items-center gap-3"
                       style={{ borderColor: 'rgba(244,63,94,0.4)', background: 'rgba(244,63,94,0.06)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--rose-2)' }}>error</span>
                    <p className="text-sm" style={{ color: 'var(--rose-2)' }}>{error}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* COL 3 — contract */}
          <aside className="space-y-5 xl:sticky xl:top-24">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">ZK contract</p>
                <span className="badge badge-indigo">Compact</span>
              </div>
              <h3 className="headline font-bold text-lg mb-3">claim_proof.compact</h3>
              <div className="rounded-xl p-4" style={{ background: '#05070b', border: '1px solid var(--line-1)' }}>
                <Syntax code={CONTRACT_SNIPPET} />
              </div>
              <p className="text-xs mt-3 leading-relaxed" style={{ color: 'var(--ink-4)' }}>
                Every claim runs this circuit. The proof commits a Poseidon hash of identity + employment data without revealing inputs.
              </p>
            </div>

            <div className="card p-6">
              <p className="eyebrow mb-3">How to read scores</p>
              <div className="space-y-2 text-sm">
                {[
                  ['70–100', 'High confidence', 'var(--success)'],
                  ['40–69',  'Needs review',    'var(--warning)'],
                  ['0–39',   'Low confidence',  'var(--danger)'],
                ].map(([range, label, c]) => (
                  <div key={range} className="flex items-center gap-3 px-3 py-2 rounded-lg"
                       style={{ background: 'var(--surface-3)', border: '1px solid var(--line-1)' }}>
                    <span className="mono font-bold tabular-nums text-xs" style={{ color: c, minWidth: 56 }}>{range}</span>
                    <span style={{ color: 'var(--ink-2)' }}>{label}</span>
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
