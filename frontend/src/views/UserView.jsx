import { useState } from 'react'
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
              {[['Claim ID', result.claim_id], ['Proof Hash', result.proof_hash]].map(([k, v]) => (
                <div key={k}>
                  <p className="eyebrow mb-1.5">{k}</p>
                  <p className="hash">{v}</p>
                </div>
              ))}
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
                  onClick={() => navigator.clipboard.writeText(result.claim_id)}
                  className="btn btn-ghost btn-sm flex-shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>content_copy</span>
                  Copy
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

          {/* Side rail: live ZK pipeline */}
          <aside className="space-y-5 xl:sticky xl:top-24">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="eyebrow mb-1">Proof pipeline</p>
                  <h3 className="headline font-bold text-lg">{loading ? 'Generating ZK proof' : 'Ready to commit'}</h3>
                </div>
                <span className={`badge ${loading ? 'badge-mint' : 'badge-slate'}`}>
                  {loading ? 'Live' : 'Idle'}
                </span>
              </div>
              <div className="space-y-2.5">
                {ZK_STEPS.map((step, i) => {
                  const done   = loading && i < zkStep
                  const active = loading && i === zkStep
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center rounded-full flex-shrink-0"
                        style={{
                          width: 22, height: 22,
                          background: done ? 'rgba(52,211,153,0.18)' : active ? 'rgba(45,212,191,0.22)' : 'var(--surface-3)',
                          border: `1px solid ${done ? 'rgba(52,211,153,0.55)' : active ? 'var(--mint)' : 'var(--line-2)'}`,
                        }}>
                        {done
                          ? <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'var(--success)', fontVariationSettings: "'FILL' 1" }}>check</span>
                          : active
                            ? <span className="dot animate-pulse" style={{ background: 'var(--mint)' }} />
                            : null}
                      </div>
                      <span className="text-sm" style={{ color: done || active ? 'var(--ink-2)' : 'var(--ink-5)' }}>{step}</span>
                    </div>
                  )
                })}
              </div>
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
    </div>
  )
}
