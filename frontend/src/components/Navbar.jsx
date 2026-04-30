const TABS = [
  { id: 'home',         label: 'Overview',  icon: 'dashboard' },
  { id: 'user',         label: 'My Claims', icon: 'badge' },
  { id: 'verification', label: 'Verify',    icon: 'verified_user' },
  { id: 'recruiter',    label: 'Discover',  icon: 'person_search' },
]

function Logo({ small = false, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2.5 group">
      <div
        className="flex items-center justify-center rounded-xl"
        style={{
          width: small ? 32 : 38,
          height: small ? 32 : 38,
          background: 'linear-gradient(135deg, #5eead4 0%, #14b8a6 100%)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.25) inset, 0 8px 20px -8px rgba(45,212,191,0.5)',
        }}>
        <span
          className="material-symbols-outlined"
          style={{ fontSize: small ? 18 : 20, color: '#042a25', fontVariationSettings: "'FILL' 1, 'wght' 600" }}>
          shield_lock
        </span>
      </div>
      <div className="text-left leading-none">
        <div className="headline font-black tracking-tight" style={{ color: 'var(--ink-1)', fontSize: small ? 16 : 18 }}>
          work<span style={{ color: 'var(--mint)' }}>proof</span>
        </div>
        {!small && (
          <div className="eyebrow mt-1.5" style={{ fontSize: 9 }}>Private Employment Rail</div>
        )}
      </div>
    </button>
  )
}

function NetworkPill({ midnight }) {
  if (!midnight?.serviceUp) {
    return (
      <span className="badge badge-rose">
        <span className="dot" style={{ background: 'var(--rose)' }} />
        Offline
      </span>
    )
  }
  const real = midnight.serviceZkMode === 'real'
  return (
    <span className={`badge ${real ? 'badge-mint' : 'badge-indigo'}`}>
      <span className="dot" style={{ background: real ? 'var(--mint)' : 'var(--indigo)', boxShadow: `0 0 8px ${real ? 'var(--mint)' : 'var(--indigo)'}` }} />
      {real ? 'ZK Live' : 'ZK Mock'}
    </span>
  )
}

function WalletButton({ midnight, compact = false }) {
  const status = midnight?.walletStatus

  if (status === 'connected') {
    return (
      <div className="flex items-center gap-2">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl mono text-xs"
          style={{ background: 'var(--surface-3)', border: '1px solid var(--line-2)', color: 'var(--ink-1)' }}>
          <span className="dot" style={{ background: 'var(--success)', boxShadow: '0 0 8px var(--success)' }} />
          {midnight.walletAddress?.slice(0, compact ? 6 : 9)}…
          {midnight.walletDemo && (
            <span className="badge badge-amber" style={{ padding: '2px 6px', fontSize: 9 }}>DEMO</span>
          )}
        </div>
        <button
          onClick={midnight?.disconnect}
          title="Disconnect wallet"
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{ width: 30, height: 30, background: 'var(--surface-3)', border: '1px solid var(--line-2)', color: 'var(--ink-4)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--rose-2)'; e.currentTarget.style.borderColor = 'rgba(244,63,94,0.4)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--ink-4)'; e.currentTarget.style.borderColor = 'var(--line-2)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15 }}>logout</span>
        </button>
      </div>
    )
  }

  if (status === 'connecting') {
    return (
      <button className="btn btn-ghost btn-sm" disabled>
        <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>progress_activity</span>
        Connecting…
      </button>
    )
  }

  if (status === 'error') {
    return (
      <button onClick={midnight?.connect} title={midnight?.walletError} className="btn btn-sm" style={{ background: 'rgba(244,63,94,0.1)', color: 'var(--rose-2)', border: '1px solid rgba(244,63,94,0.3)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>error</span>
        Retry
      </button>
    )
  }

  return (
    <button onClick={midnight?.connect} className="btn btn-primary btn-sm">
      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>account_balance_wallet</span>
      Connect
    </button>
  )
}

export default function Navbar({ currentTab, setCurrentTab, midnight }) {
  return (
    <header
      className="sticky top-0 z-50 w-full"
      style={{
        background: 'rgba(7, 9, 15, 0.78)',
        backdropFilter: 'blur(18px) saturate(140%)',
        WebkitBackdropFilter: 'blur(18px) saturate(140%)',
        borderBottom: '1px solid var(--line-1)',
      }}>

      {/* Desktop */}
      <div className="cp-fluid hidden lg:flex items-center gap-8 h-[68px]">
        <Logo onClick={() => setCurrentTab('home')} />

        <nav className="flex items-center gap-1 ml-2">
          {TABS.map(t => {
            const active = currentTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setCurrentTab(t.id)}
                className="relative flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{
                  color: active ? 'var(--ink-1)' : 'var(--ink-3)',
                  background: active ? 'rgba(45, 212, 191, 0.08)' : 'transparent',
                }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: 18,
                    color: active ? 'var(--mint)' : 'var(--ink-4)',
                    fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                  }}>
                  {t.icon}
                </span>
                {t.label}
                {active && (
                  <span
                    className="absolute -bottom-[18px] left-3 right-3 h-[2px] rounded-full"
                    style={{ background: 'linear-gradient(90deg, transparent, var(--mint), transparent)' }} />
                )}
              </button>
            )
          })}
        </nav>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          <NetworkPill midnight={midnight} />
          <WalletButton midnight={midnight} />
        </div>
      </div>

      {/* Mobile / tablet */}
      <div className="lg:hidden">
        <div className="cp-fluid flex items-center justify-between h-14">
          <Logo small onClick={() => setCurrentTab('home')} />
          <div className="flex items-center gap-2">
            <NetworkPill midnight={midnight} />
            <WalletButton midnight={midnight} compact />
          </div>
        </div>
        <div className="flex border-t overflow-x-auto" style={{ borderColor: 'var(--line-1)' }}>
          {TABS.map(t => {
            const active = currentTab === t.id
            return (
              <button
                key={t.id}
                onClick={() => setCurrentTab(t.id)}
                className="flex-1 min-w-[72px] flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors relative"
                style={{ color: active ? 'var(--mint-2)' : 'var(--ink-4)' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: 20, fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}>
                  {t.icon}
                </span>
                {t.label}
                {active && (
                  <span
                    className="absolute top-0 left-4 right-4 h-[2px] rounded-b-full"
                    style={{ background: 'var(--mint)' }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </header>
  )
}
