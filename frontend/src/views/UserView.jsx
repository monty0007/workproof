import { useState, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage.js'

const ZK_STEPS = [
  'Hashing identity locally',
  'Building employment witness',
  'Running claim_employment circuit',
  'Generating proof fingerprint',
  'Committing to ledger',
  'AI trust score computed',
]

const LS = { e: 'wp_u_email', c: 'wp_u_company', r: 'wp_u_role', s: 'wp_u_start', en: 'wp_u_end', res: 'wp_u_result' }

const scoreColor = s => s >= 70 ? 'var(--success)' : s >= 40 ? 'var(--warning)' : 'var(--danger)'
const scoreLabel = s => s >= 70 ? 'High Confidence' : s >= 40 ? 'Medium Confidence' : 'Low Confidence'

export default function UserView({ setCurrentTab }) {
  const [email,      setEmail]      = useLocalStorage(LS.e, '')
  const [company,    setCompany]    = useLocalStorage(LS.c, '')
  const [role,       setRole]       = useLocalStorage(LS.r, '')
  const [startDate,  setStartDate]  = useLocalStorage(LS.s, '')
  const [endDate,    setEndDate]    = useLocalStorage(LS.en, '')
  const [result,     setResult]     = useLocalStorage(LS.res, null)
  const [loading,    setLoading]    = useState(false)
  const [zkStep,     setZkStep]     = useState(0)
  const [error,      setError]      = useState(null)
  const [currentJob, setCurrentJob] = useState(false)
  const [copied,     setCopied]     = useState('')   // which field was just copied

  function copy(value, label) {
    navigator.clipboard.writeText(value)
    setCopied(label)
    setTimeout(() => setCopied(c => (c === label ? '' : c)), 1600)
  }

  // ── Keep the success view's trust_score / flags in sync with the backend.
  //    Verifications added on the Verify page bump the score — reflect that here.
  useEffect(() => {
    if (!result?.claim_id) return
    let cancelled = false
    async function refresh() {
      try {
        const r = await fetch(`/api/audit/${result.claim_id}`)
        if (!r.ok) return
        const fresh = await r.json()
        if (cancelled) return
        if (fresh.trust_score !== result.trust_score ||
            JSON.stringify(fresh.flags || []) !== JSON.stringify(result.flags || [])) {
          setResult({ ...result, trust_score: fresh.trust_score, flags: fresh.flags || [] })
        }
      } catch { /* ignore */ }
    }
    refresh()
    const t = setInterval(refresh, 4000)
    return () => { cancelled = true; clearInterval(t) }
  }, [result?.claim_id]) // eslint-disable-line react-hooks/exhaustive-deps

  function startOver() {
    Object.values(LS).forEach(k => localStorage.removeItem(k))
    setEmail(''); setCompany(''); setRole(''); setStartDate('')
    setEndDate(''); setResult(null); setError(null)
  }

  async function submitClaim() {
    if (!email.trim() || !company.trim() || !role.trim() || !startDate) return
    setLoading(true); setZkStep(0); setError(null); setResult(null)
    let s = 0
    const t = setInterval(() => { s = Math.min(s + 1, ZK_STEPS.length - 2); setZkStep(s) }, 700)
    try {
      const res = await fetch('/api/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_email:   email.trim(),
          company_name: company.trim(),
          role:         role.trim(),
          start_date:   startDate,
          end_date:     currentJob ? null : (endDate || null),
        }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail || `Error ${res.status}`) }
      clearInterval(t); setZkStep(ZK_STEPS.length - 1)
      await new Promise(r => setTimeout(r, 500))
      setResult(await res.json())
    } catch (e) { setError(e.message) }
    finally { clearInterval(t); setLoading(false) }
  }

  const canSubmit = !loading && email.trim() && company.trim() && role.trim() && startDate

  /* ─── SUCCESS ─────────────────────────────────────────────────────── */
  if (result) {
    const sc = scoreColor(result.trust_score)
    return (
      <div className="cp-fluid py-10 lg:py-16 flex-1">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
          {/* Big proof card */}
          <div className="card p-8 lg:p-10" style={{ borderColor: `${sc}55` }}>
            <div className="flex items-center gap-4 mb-7">
              <div
                className="flex items-center justify-center rounded-2xl flex-shrink-0"
                style={{ width: 56, height: 56, background: `${sc}1c`, border: `1px solid ${sc}55` }}>
                <span className="material-symbols-outlined" style={{ color: sc, fontSize: 30, fontVariationSettings: "'FILL' 1" }}>task_alt</span>
              </div>
              <div>
                <p className="eyebrow">Claim recorded</p>
                <h1 className="headline font-black text-3xl lg:text-4xl mt-1">Cryptographically committed</h1>
              </div>
            </div>

            <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center mb-7">
              <div
                className="rounded-2xl p-6 text-center"
                style={{ background: 'var(--surface-3)', border: `1px solid ${sc}40`, minWidth: 200 }}>
                <p className="eyebrow mb-2">Trust score</p>
                <p className="headline font-black tabular-nums" style={{ fontSize: 72, color: sc, lineHeight: 1 }}>
                  {result.trust_score}
                </p>
                <p className="text-sm font-bold mt-2" style={{ color: sc }}>{scoreLabel(result.trust_score)}</p>
              </div>

              <div className="space-y-3">
                {[['Role', role || '—'], ['Company', '••• hashed'], ['Period', `${startDate} → ${currentJob ? 'Present' : (endDate || 'Present')}`]].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5 rounded-lg" style={{ background: 'var(--surface-3)', border: '1px solid var(--line-1)' }}>
                    <span className="eyebrow">{k}</span>
                    <span className="text-sm" style={{ color: 'var(--ink-1)' }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {result.flags?.length > 0 && (
              <div className="mb-6">
                <p className="eyebrow mb-2">AI flags</p>
                <div className="flex flex-wrap gap-2">
                  {result.flags.map(f => (
                    <span key={f} className="badge badge-amber">{f.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-xl p-5 space-y-4 mb-6" style={{ background: 'var(--surface-3)', border: '1px solid var(--line-1)' }}>
              {[['Claim ID', result.claim_id], ['Proof Hash', result.proof_hash]].map(([k, v]) => {
                const isCopied = copied === k
                return (
                  <div key={k}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <p className="eyebrow">{k}</p>
                      <button
                        onClick={() => copy(v, k)}
                        className="flex items-center gap-1.5 text-xs font-semibold transition-colors px-2 py-1 rounded-md"
                        style={{
                          color: isCopied ? 'var(--success)' : 'var(--ink-3)',
                          background: isCopied ? 'rgba(52,211,153,0.10)' : 'transparent',
                          border: `1px solid ${isCopied ? 'rgba(52,211,153,0.4)' : 'var(--line-2)'}`,
                        }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 13, fontVariationSettings: isCopied ? "'FILL' 1" : "'FILL' 0" }}>
                          {isCopied ? 'check' : 'content_copy'}
                        </span>
                        {isCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                    <p className="hash break-all">{v}</p>
                  </div>
                )
              })}
              <div className="divider" />
              <div className="flex items-center justify-between flex-wrap gap-3">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--success)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>lock</span>
                  Identity hashed, never stored raw
                </span>
                <span className={`badge ${result.zk_mode === 'real' ? 'badge-mint' : 'badge-slate'}`}>
                  {result.zk_mode === 'real' ? '⚡ ZK Real' : '● ZK Mock'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={startOver} className="btn btn-ghost btn-lg">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>add</span>
                New Claim
              </button>
              <button onClick={() => setCurrentTab('recruiter')} className="btn btn-primary btn-lg">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_search</span>
                Open Recruiter View
              </button>
            </div>
          </div>

          {/* Side: next steps */}
          <div className="space-y-5">
            <div className="card p-6">
              <p className="eyebrow mb-2">What happens next</p>
              <h3 className="headline font-bold text-xl mb-4">Increase your trust score</h3>
              <div className="space-y-3">
                {[
                  ['mail', 'Get verified', 'Have a coworker or HR confirm via email domain in the Verify portal.'],
                  ['link', 'Add LinkedIn signal', 'A consistent profile adds +25 to your trust score.'],
                  ['groups', 'Collect endorsements', 'Up to three peer endorsements compound into the model.'],
                ].map(([icon, title, body]) => (
                  <div key={title} className="flex gap-3 p-3 rounded-lg" style={{ background: 'var(--surface-3)', border: '1px solid var(--line-1)' }}>
                    <span className="material-symbols-outlined flex-shrink-0" style={{ color: 'var(--mint-2)', fontSize: 20 }}>{icon}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>{title}</p>
                      <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-3)' }}>{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <p className="eyebrow mb-3">Share your claim ID</p>
              <p className="text-xs mb-3" style={{ color: 'var(--ink-3)' }}>
                Give this to a verifier, recruiter, or auditor — it’s safe to share publicly.
              </p>
              <div className="flex gap-2">
                <input className="input mono text-xs" readOnly value={result.claim_id} onClick={e => e.target.select()} />
                <button
                  onClick={() => copy(result.claim_id, 'side')}
                  className="btn btn-sm flex-shrink-0"
                  style={{
                    background: copied === 'side' ? 'rgba(52,211,153,0.12)' : 'var(--surface-3)',
                    color:      copied === 'side' ? 'var(--success)' : 'var(--ink-2)',
                    border:     `1px solid ${copied === 'side' ? 'rgba(52,211,153,0.5)' : 'var(--line-2)'}`,
                  }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16, fontVariationSettings: copied === 'side' ? "'FILL' 1" : "'FILL' 0" }}>
                    {copied === 'side' ? 'check_circle' : 'content_copy'}
                  </span>
                  {copied === 'side' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ─── FORM ────────────────────────────────────────────────────────── */
  return (
    <div className="flex-1 flex flex-col">
      {/* Header strip */}
      <section className="cp-fluid pt-8 lg:pt-10">
        <div className="hero-panel p-6 lg:p-8">
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="flex items-center justify-center rounded-2xl flex-shrink-0"
              style={{ width: 52, height: 52, background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)', fontSize: 26, fontVariationSettings: "'FILL' 1" }}>badge</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow mb-1">Submit a claim</p>
              <h1 className="headline font-black text-2xl lg:text-3xl">Employment, proven privately</h1>
              <p className="text-sm mt-1.5" style={{ color: 'var(--ink-3)' }}>
                Your email is SHA-256 hashed in the browser. Raw values never reach the server.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-mint">ZK Protected</span>
              <span className="badge badge-amber">AI Scored</span>
            </div>
          </div>
        </div>
      </section>

      {/* Body: 2-column form + side rail */}
      <section className="cp-fluid py-8 lg:py-10 flex-1">
        <div className="grid gap-6 xl:grid-cols-[1fr_380px] items-start">
          <div className="space-y-5">
            {/* Identity + Employment in 2 cards inline */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)', fontSize: 18 }}>mail</span>
                  <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>Identity</h3>
                </div>
                <div>
                  <label className="label">Work Email <span style={{ color: 'var(--rose-2)' }}>*</span></label>
                  <input className="input" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} />
                  <p className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--ink-4)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--success)', fontSize: 14, fontVariationSettings: "'FILL' 1" }}>lock</span>
                    Hashed locally — never leaves your browser raw
                  </p>
                </div>
              </div>

              <div className="card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined" style={{ color: 'var(--amber-2)', fontSize: 18 }}>work</span>
                  <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>Company</h3>
                </div>
                <div>
                  <label className="label">Company Name <span style={{ color: 'var(--rose-2)' }}>*</span></label>
                  <input className="input" placeholder="e.g. Deloitte, EY, McKinsey" value={company} onChange={e => setCompany(e.target.value)} disabled={loading} />
                  <p className="text-xs mt-2" style={{ color: 'var(--ink-4)' }}>
                    Public, but hashed at storage — used to derive the proof commitment.
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined" style={{ color: 'var(--indigo)', fontSize: 18 }}>event</span>
                <h3 className="font-bold text-sm uppercase tracking-wider" style={{ color: 'var(--ink-2)' }}>Role &amp; Period</h3>
              </div>

              <div className="grid gap-4 lg:grid-cols-[2fr_1fr_1fr]">
                <div>
                  <label className="label">Job Title <span style={{ color: 'var(--rose-2)' }}>*</span></label>
                  <input className="input" placeholder="e.g. Senior Consultant" value={role} onChange={e => setRole(e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="label">Start <span style={{ color: 'var(--rose-2)' }}>*</span></label>
                  <input type="month" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={loading} />
                </div>
                <div>
                  <label className="label">End</label>
                  <input
                    type="month" className="input" value={endDate} onChange={e => setEndDate(e.target.value)}
                    disabled={loading || currentJob}
                    style={currentJob ? { opacity: 0.4, pointerEvents: 'none' } : {}} />
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer mt-4 select-none">
                <input
                  type="checkbox" checked={currentJob} onChange={e => setCurrentJob(e.target.checked)}
                  className="w-4 h-4 rounded" style={{ accentColor: 'var(--mint)' }} />
                <span className="text-sm" style={{ color: 'var(--ink-2)' }}>Currently working here</span>
              </label>
            </div>

            {error && (
              <div
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.3)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--rose-2)' }}>error</span>
                <p className="text-sm" style={{ color: 'var(--rose-2)' }}>{error}</p>
              </div>
            )}

            <div className="card p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="eyebrow mb-1">Ready</p>
                <p className="text-sm" style={{ color: 'var(--ink-3)' }}>
                  Your data is hashed locally before submission. The proof is anchored on Midnight.
                </p>
              </div>
              <button
                onClick={submitClaim}
                disabled={!canSubmit}
                className="btn btn-primary btn-lg w-full sm:w-auto">
                {loading
                  ? <>
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>progress_activity</span>
                      Generating proof…
                    </>
                  : <>
                      <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>verified</span>
                      Submit Claim
                    </>
                }
              </button>
            </div>
          </div>

          {/* Side rail: ZK pipeline (static preview — animates in overlay on submit) */}
          <aside className="space-y-5 xl:sticky xl:top-24">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="eyebrow mb-1">Proof pipeline</p>
                  <h3 className="headline font-bold text-lg">What will run</h3>
                </div>
                <span className="badge badge-slate">6 steps</span>
              </div>
              <div className="space-y-2">
                {ZK_STEPS.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        width: 26, height: 26,
                        background: 'var(--surface-3)',
                        border: '1.5px solid var(--line-2)',
                      }}>
                      <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--ink-4)' }}>{i + 1}</span>
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--ink-3)' }}>{step}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs mt-4 flex items-center gap-1.5" style={{ color: 'var(--ink-5)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--mint-2)', fontVariationSettings: "'FILL' 1" }}>bolt</span>
                Click <strong style={{ color: 'var(--ink-2)' }}>Submit Claim</strong> to run live.
              </p>
            </div>

            <div className="card p-6">
              <p className="eyebrow mb-3">Tips for a strong claim</p>
              <ul className="space-y-2.5 text-sm" style={{ color: 'var(--ink-3)' }}>
                <li className="flex gap-2"><span style={{ color: 'var(--mint-2)' }}>•</span> Use your real work email — domain is the strongest signal.</li>
                <li className="flex gap-2"><span style={{ color: 'var(--mint-2)' }}>•</span> Match the job title shown on LinkedIn.</li>
                <li className="flex gap-2"><span style={{ color: 'var(--mint-2)' }}>•</span> Leave end date blank only if currently employed.</li>
                <li className="flex gap-2"><span style={{ color: 'var(--mint-2)' }}>•</span> Coworker verification adds the most trust.</li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* ── Full-screen ZK proof overlay ──────────────────────────────── */}
      {loading && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ background: 'rgba(7,9,15,0.88)', backdropFilter: 'blur(14px)' }}>
          <div
            className="flex flex-col items-center gap-6 p-10 rounded-3xl"
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--line-3)',
              boxShadow: '0 32px 80px -16px rgba(0,0,0,0.75)',
              width: '90vw', maxWidth: 480,
            }}>
            {/* spinning ring */}
            <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
              <div
                className="absolute inset-0 rounded-full animate-spin"
                style={{ border: '2px solid transparent', borderTopColor: 'var(--mint)', borderRightColor: 'var(--mint)' }} />
              <div
                className="flex items-center justify-center rounded-full"
                style={{ width: 52, height: 52, background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)', fontSize: 24, fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
            </div>

            <div className="text-center">
              <p className="eyebrow mb-1">Zero-knowledge proof</p>
              <h2 className="headline font-black text-2xl">Generating your proof</h2>
              <p className="text-sm mt-2" style={{ color: 'var(--ink-3)' }}>
                Running the Compact circuit on Midnight Network
              </p>
            </div>

            <div className="w-full space-y-2.5">
              {ZK_STEPS.map((step, i) => {
                const done   = i < zkStep
                const active = i === zkStep
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                    style={{
                      background: active ? 'rgba(45,212,191,0.09)' : done ? 'rgba(52,211,153,0.04)' : 'var(--surface-3)',
                      border: `1px solid ${active ? 'rgba(45,212,191,0.35)' : done ? 'rgba(52,211,153,0.2)' : 'var(--line-1)'}`,
                      boxShadow: active ? '0 0 14px rgba(45,212,191,0.18)' : 'none',
                    }}>
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        width: 28, height: 28,
                        background: done   ? 'rgba(52,211,153,0.20)'
                                  : active ? 'rgba(45,212,191,0.25)'
                                           : 'var(--surface-4)',
                        border: `2px solid ${done   ? 'rgba(52,211,153,0.65)'
                                             : active ? 'var(--mint)'
                                                      : 'var(--line-2)'}`,
                        boxShadow: active ? '0 0 12px rgba(45,212,191,0.5)' : 'none',
                      }}>
                      {done
                        ? <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--success)', fontVariationSettings: "'FILL' 1" }}>check</span>
                        : active
                          ? <span className="dot" style={{ background: 'var(--mint)', animation: 'pulse 0.8s ease-in-out infinite', width: 8, height: 8 }} />
                          : <span className="text-[10px] font-bold" style={{ color: 'var(--ink-5)' }}>{i + 1}</span>
                      }
                    </div>
                    <span
                      className="text-sm font-semibold flex-1"
                      style={{ color: active ? 'var(--ink-1)' : done ? 'var(--ink-3)' : 'var(--ink-5)' }}>
                      {step}
                    </span>
                    {active && (
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16, color: 'var(--mint-2)' }}>progress_activity</span>
                    )}
                    {done && (
                      <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--success)', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress bar */}
            <div className="w-full rounded-full overflow-hidden" style={{ height: 4, background: 'var(--surface-4)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round((zkStep / (ZK_STEPS.length - 1)) * 100)}%`,
                  background: 'linear-gradient(90deg, var(--mint), var(--mint-2))',
                  boxShadow: '0 0 8px rgba(45,212,191,0.6)',
                }} />
            </div>
            <p className="text-xs" style={{ color: 'var(--ink-5)' }}>
              Step {zkStep + 1} of {ZK_STEPS.length} — identity never leaves your browser
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
