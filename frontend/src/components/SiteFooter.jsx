export default function SiteFooter({ setCurrentTab }) {
  return (
    <footer className="w-full mt-auto" style={{ background: 'var(--surface-1)', borderTop: '1px solid var(--line-1)' }}>
      <div className="cp-fluid py-12">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{
                  width: 38, height: 38,
                  background: 'linear-gradient(135deg, #5eead4 0%, #14b8a6 100%)',
                  boxShadow: '0 8px 20px -8px rgba(45,212,191,0.45)',
                }}>
                <span className="material-symbols-outlined" style={{ color: '#042a25', fontVariationSettings: "'FILL' 1, 'wght' 600", fontSize: 20 }}>shield_lock</span>
              </div>
              <div className="leading-none">
                <div className="headline font-black text-lg" style={{ color: 'var(--ink-1)' }}>
                  work<span style={{ color: 'var(--mint)' }}>proof</span>
                </div>
                <div className="eyebrow mt-1.5" style={{ fontSize: 9 }}>Private Employment Rail</div>
              </div>
            </div>
            <p className="text-sm copy-readable" style={{ color: 'var(--ink-3)' }}>
              Cryptographic employment verification on the Midnight Network. Candidates keep raw identity private; recruiters get evidence they can audit.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-mint">ZK Protected</span>
              <span className="badge badge-amber">AI Scored</span>
              <span className="badge badge-slate">Audit Ready</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="eyebrow">Platform</p>
            {[['home','Overview'],['user','My Claims'],['verification','Verify'],['recruiter','Discover']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setCurrentTab(id)}
                className="block text-sm transition-colors hover:text-white"
                style={{ color: 'var(--ink-3)' }}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            <p className="eyebrow">Network</p>
            {[
              ['Midnight Docs', 'https://docs.midnight.network'],
              ['Testnet Faucet', 'https://midnight.network/faucet'],
              ['Compact Lang', 'https://docs.midnight.network/develop/compact'],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm transition-colors hover:text-white"
                style={{ color: 'var(--ink-3)' }}>
                {label} <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
              </a>
            ))}
          </div>

          <div className="space-y-3">
            <p className="eyebrow">Trust Principles</p>
            {['Hash-only privacy', 'ZK proof verified', 'AI deterministic', 'Open source'].map(l => (
              <p key={l} className="text-sm" style={{ color: 'var(--ink-4)' }}>· {l}</p>
            ))}
          </div>
        </div>

        <div className="divider mt-10 mb-6" />
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: 'var(--ink-5)' }}>
          <p>© 2026 WorkProof — Built on <span style={{ color: 'var(--mint-2)' }}>Midnight Network</span></p>
          <p>Zero raw identity stored. Ever.</p>
        </div>
      </div>
    </footer>
  )
}
