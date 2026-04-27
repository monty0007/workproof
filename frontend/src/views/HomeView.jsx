import SiteFooter from '../components/SiteFooter'

const STATS = [
  { v: '0',         u: 'bytes',  l: 'Raw identity stored' },
  { v: '0–100',     u: '',       l: 'Trust score range' },
  { v: '<50',       u: 'ms',     l: 'Proof verification' },
  { v: 'On-chain',  u: '',       l: 'Midnight Network' },
]

const STEPS = [
  {
    n: '01', icon: 'badge', accent: 'var(--mint)',
    title: 'Candidate commits a claim',
    body: 'User submits employment details. Email + company are SHA-256 hashed locally. A ZK proof anchors the claim — raw values never leave the browser.',
  },
  {
    n: '02', icon: 'verified_user', accent: 'var(--indigo)',
    title: 'Verifier adds a signal',
    body: 'HR, peer, or system verifier confirms via email domain, LinkedIn, document, or manual review. Trust score updates deterministically.',
  },
  {
    n: '03', icon: 'person_search', accent: 'var(--amber)',
    title: 'Recruiter inspects evidence',
    body: 'Recruiter sees the trust score, confidence band, verification trail, and proof hashes. Every signal is traceable, not guessed.',
  },
]

const FEATURES = [
  { icon: 'shield_lock',   title: 'Hash-first identity', body: 'Email and company are hashed in the browser. Zero raw PII at the storage layer.' },
  { icon: 'auto_graph',    title: 'Deterministic trust', body: 'A 0–100 score derived from verifiable signals. No black-box ML, no surprises.' },
  { icon: 'workspace_premium', title: 'Audit-grade trail', body: 'Every claim and verification produces a proof hash you can re-check independently.' },
  { icon: 'speed',         title: 'Sub-50ms verify',     body: 'Proof inspection is fast enough to drop into recruiter workflows without friction.' },
]

const SCORING = [
  ['+30', 'Email domain matches the company',  'mint'],
  ['+25', 'LinkedIn profile is consistent',    'mint'],
  ['+20', 'Peer endorsements (capped at 3)',   'mint'],
  ['+15', 'Employment duration is realistic',  'mint'],
  ['−40', 'Suspicious role or duration',       'rose'],
]

const STORED = [
  ['SHA-256 of user email',   true],
  ['SHA-256 of company name', true],
  ['Role title',              true],
  ['Employment dates',        true],
  ['Proof hash + score',      true],
  ['Verification proof',      true],
  ['Raw email address',       false],
  ['Raw company name',        false],
  ['LinkedIn URL',            false],
]

const TECH = [
  { icon: 'code_blocks', name: 'Compact',   sub: 'ZK contract DSL by Midnight' },
  { icon: 'memory',      name: 'Midnight',  sub: 'Privacy-first L1 blockchain' },
  { icon: 'hub',         name: 'FastAPI',   sub: 'Hash-only privacy backend' },
  { icon: 'web',         name: 'React',     sub: 'Vite + instant HMR' },
  { icon: 'psychology',  name: 'AI Engine', sub: 'Deterministic 0–100 score' },
  { icon: 'dns',         name: 'ZK Bridge', sub: 'Node.js WASM proof pipeline' },
]

export default function HomeView({ setCurrentTab }) {
  return (
    <div className="flex-1 flex flex-col">
      {/* ─── HERO ─────────────────────────────────────────────────────── */}
      <section className="cp-fluid pt-8 lg:pt-12">
        <div className="hero-panel p-6 lg:p-12">
          <div className="grid gap-10 xl:grid-cols-[1.5fr_1fr] xl:items-center">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2">
                <span className="badge badge-mint">
                  <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>lock</span>
                  Zero-knowledge
                </span>
                <span className="badge badge-indigo">Midnight Network</span>
                <span className="badge badge-amber">AI Trust Scoring</span>
              </div>

              <h1 className="headline font-black tracking-tight leading-[0.96]"
                  style={{ fontSize: 'clamp(2.4rem, 5vw, 4.6rem)', color: 'var(--ink-1)' }}>
                Employment proof,
                <br />
                <span className="grad-mint">without blind trust.</span>
              </h1>

              <p className="copy-readable-wide text-lg leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                WorkProof turns employment claims into private, verifiable evidence. Candidates keep raw identity off the wire. Recruiters get evidence they can audit instead of bullet points they have to believe.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <button onClick={() => setCurrentTab('user')} className="btn btn-primary btn-lg">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>badge</span>
                  Submit a Claim
                </button>
                <button onClick={() => setCurrentTab('verification')} className="btn btn-ghost btn-lg">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified_user</span>
                  Verify a Claim
                </button>
                <button onClick={() => setCurrentTab('recruiter')} className="btn btn-outline btn-lg">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_search</span>
                  Recruiter View
                </button>
              </div>
            </div>

            {/* Stats column */}
            <div className="grid grid-cols-2 gap-3">
              {STATS.map(s => (
                <div key={s.l} className="stat">
                  <div className="stat-value">
                    {s.v}
                    {s.u && <span className="text-base font-medium ml-1" style={{ color: 'var(--ink-4)' }}>{s.u}</span>}
                  </div>
                  <div className="stat-label">{s.l}</div>
                </div>
              ))}
              <div className="surface-soft p-5 col-span-2">
                <div className="flex items-start gap-3">
                  <span className="material-symbols-outlined" style={{ color: 'var(--amber-2)', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>bolt</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>Why it matters</p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-3)' }}>
                      Résumés are self-reported, LinkedIn is unverified, and recruiters rely on blind trust. WorkProof removes that dependency at the protocol level.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────── */}
      <section className="cp-fluid pt-16 lg:pt-24">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
          <div>
            <p className="eyebrow mb-2">Protocol</p>
            <h2 className="headline font-black text-4xl lg:text-5xl">How it <span className="grad-mint">works</span></h2>
          </div>
          <p className="text-base copy-readable" style={{ color: 'var(--ink-3)' }}>
            Three roles, three steps. Zero blind trust at any boundary.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.n} className="card p-7 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <span
                  className="headline font-black opacity-25"
                  style={{ fontSize: 56, lineHeight: 1, color: s.accent }}>
                  {s.n}
                </span>
                <div
                  className="flex items-center justify-center rounded-2xl"
                  style={{
                    width: 48, height: 48,
                    background: `${s.accent}1f`,
                    border: `1px solid ${s.accent}55`,
                  }}>
                  <span className="material-symbols-outlined" style={{ color: s.accent, fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                </div>
              </div>
              <div>
                <h3 className="headline font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>{s.body}</p>
              </div>
              <button
                onClick={() => setCurrentTab(['user', 'verification', 'recruiter'][i])}
                className="btn btn-outline btn-sm self-start mt-auto">
                Open
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────── */}
      <section className="cp-fluid pt-16 lg:pt-24">
        <div className="mb-8">
          <p className="eyebrow mb-2">Capabilities</p>
          <h2 className="headline font-black text-4xl lg:text-5xl">
            Built for <span className="grad-cool">premium hiring teams</span>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(f => (
            <div key={f.title} className="card p-6 flex flex-col gap-4 h-full">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: 44, height: 44, background: 'rgba(45,212,191,0.10)', border: '1px solid rgba(45,212,191,0.25)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
              </div>
              <div>
                <h3 className="headline font-bold text-base mb-1.5">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── SCORING + PRIVACY ───────────────────────────────────────── */}
      <section className="cp-fluid pt-16 lg:pt-24">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="card p-7 lg:p-9">
            <p className="eyebrow mb-2">Trust engine</p>
            <h2 className="headline font-black text-3xl lg:text-4xl mb-3">
              AI score. <span className="grad-amber">Not vibes.</span>
            </h2>
            <p className="text-base mb-6 copy-readable" style={{ color: 'var(--ink-3)' }}>
              Every claim gets a deterministic 0–100 trust score from verifiable signals — not gut feel. The score updates each time a new signal is added.
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {SCORING.map(([pts, label, tone]) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: 'var(--surface-3)', border: '1px solid var(--line-1)' }}>
                  <span
                    className="mono font-bold text-sm tabular-nums"
                    style={{ color: tone === 'mint' ? 'var(--mint-2)' : 'var(--rose-2)', minWidth: 36 }}>
                    {pts}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--ink-2)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-7 lg:p-9">
            <p className="eyebrow mb-2">Privacy contract</p>
            <h2 className="headline font-black text-2xl lg:text-3xl mb-5">
              What stays. What never lands.
            </h2>
            <div className="space-y-2">
              {STORED.map(([label, kept]) => (
                <div
                  key={label}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg"
                  style={{
                    background: kept ? 'rgba(52,211,153,0.06)' : 'rgba(244,63,94,0.05)',
                    border: `1px solid ${kept ? 'rgba(52,211,153,0.18)' : 'rgba(244,63,94,0.15)'}`,
                  }}>
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: 18, color: kept ? 'var(--success)' : 'var(--rose-2)', fontVariationSettings: "'FILL' 1" }}>
                    {kept ? 'check_circle' : 'cancel'}
                  </span>
                  <span className="text-sm" style={{ color: kept ? 'var(--ink-2)' : 'var(--ink-3)' }}>{label}</span>
                  <span className="ml-auto eyebrow" style={{ fontSize: 9, color: kept ? 'var(--success)' : 'var(--rose-2)' }}>
                    {kept ? 'Stored (hashed)' : 'Never'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TECH ────────────────────────────────────────────────────── */}
      <section className="cp-fluid pt-16 lg:pt-24">
        <div className="mb-8">
          <p className="eyebrow mb-2">Stack</p>
          <h2 className="headline font-black text-4xl lg:text-5xl">Built on <span className="grad-mint">proven tech</span></h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {TECH.map(t => (
            <div key={t.name} className="surface-soft p-4 flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-lg flex-shrink-0"
                style={{ width: 36, height: 36, background: 'var(--surface-3)', border: '1px solid var(--line-2)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)', fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--ink-1)' }}>{t.name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--ink-4)' }}>{t.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────── */}
      <section className="cp-fluid pt-16 lg:pt-24 pb-20">
        <div className="hero-panel p-8 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <span className="badge badge-mint mb-4 inline-flex">Ready to start</span>
              <h2 className="headline font-black text-3xl lg:text-5xl mb-4">
                Prove your experience.
                <br />
                <span className="grad-mint">Trust nothing. Verify everything.</span>
              </h2>
              <p className="text-base copy-readable mb-7" style={{ color: 'var(--ink-3)' }}>
                All four portals run live in mock ZK mode — no wallet required to explore the workflow end-to-end.
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setCurrentTab('user')} className="btn btn-primary btn-lg">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, fontVariationSettings: "'FILL' 1" }}>badge</span>
                  Submit Claim
                </button>
                <button onClick={() => setCurrentTab('verification')} className="btn btn-ghost btn-lg">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>verified_user</span>
                  Verify
                </button>
                <button onClick={() => setCurrentTab('recruiter')} className="btn btn-outline btn-lg">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_search</span>
                  Discover
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: 'lock',       t: 'Identity hashed',      d: 'SHA-256 in the browser before any bytes leave.' },
                { icon: 'psychology', t: 'AI scoring',           d: 'Deterministic, explainable, recomputable.' },
                { icon: 'bolt',       t: 'Sub-50ms verify',      d: 'Inspection fits inside a recruiter workflow.' },
                { icon: 'hub',        t: 'Midnight Network',     d: 'Privacy-first L1 for cryptographic anchoring.' },
              ].map(f => (
                <div key={f.t} className="surface-soft p-4">
                  <div
                    className="flex items-center justify-center rounded-lg mb-3"
                    style={{ width: 36, height: 36, background: 'rgba(45,212,191,0.10)', border: '1px solid rgba(45,212,191,0.22)' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)', fontSize: 18, fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--ink-1)' }}>{f.t}</p>
                  <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ink-4)' }}>{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter setCurrentTab={setCurrentTab} />
    </div>
  )
}
