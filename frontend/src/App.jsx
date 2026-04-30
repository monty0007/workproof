import { useState } from 'react'
import Navbar from './components/Navbar'
import HomeView from './views/HomeView'
import UserView from './views/UserView'
import RecruiterView from './views/RecruiterView'
import VerificationView from './views/VerificationView'
import { useMidnight } from './hooks/useMidnight.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'

const VALID_TABS = ['home', 'user', 'recruiter', 'verification']

function WalletConnectModal({ onCancel }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(7,9,15,0.82)', backdropFilter: 'blur(12px)' }}>
      <div
        className="flex flex-col items-center gap-6 p-10 rounded-3xl text-center"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--line-3)',
          boxShadow: '0 32px 80px -16px rgba(0,0,0,0.7)',
          maxWidth: 420, width: '90vw',
        }}>
        {/* animated ring */}
        <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{ border: '2px solid transparent', borderTopColor: 'var(--mint)', borderRightColor: 'var(--mint)' }} />
          <div
            className="flex items-center justify-center rounded-full"
            style={{ width: 60, height: 60, background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.3)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--mint-2)', fontSize: 28, fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">Connecting wallet</p>
          <h2 className="headline font-black text-2xl mb-3">Approve in Lace</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--ink-3)' }}>
            The Lace popup is waiting in your{' '}
            <strong style={{ color: 'var(--mint)' }}>browser toolbar ↗</strong>
            {' '}(top-right corner).<br />
            Click the Lace icon and approve the connection.
          </p>
          <p className="text-xs mt-3" style={{ color: 'var(--ink-5)' }}>
            No Lace installed? A demo wallet will connect automatically after a few seconds.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-4)' }}>
          <span className="dot animate-pulse" style={{ background: 'var(--mint)' }} />
          Awaiting approval in browser toolbar…
        </div>

        <button onClick={onCancel} className="btn btn-ghost btn-sm w-full">
          Cancel
        </button>
      </div>
    </div>
  )
}

function App() {
  const [currentTab, setCurrentTab] = useLocalStorage('wp_tab', 'home')
  const safeTab = VALID_TABS.includes(currentTab) ? currentTab : 'home'
  const midnight = useMidnight()
  const [auditQuery, setAuditQuery] = useState('')

  function goVerify(claimId) {
    setAuditQuery(claimId)
    setCurrentTab('verification')
  }

  return (
    <div className="app-shell flex flex-col min-h-screen w-full">
      <Navbar currentTab={safeTab} setCurrentTab={setCurrentTab} midnight={midnight} />
      {midnight.walletStatus === 'connecting' && (
        <WalletConnectModal onCancel={midnight.disconnect} />
      )}

      <main className="flex-1 flex flex-col w-full">
        <div className={safeTab === 'home' ? 'flex-1 flex flex-col' : 'hidden'}>
          <HomeView setCurrentTab={setCurrentTab} />
        </div>
        <div className={safeTab === 'user' ? 'flex-1 flex flex-col' : 'hidden'}>
          <UserView setCurrentTab={setCurrentTab} />
        </div>
        <div className={safeTab === 'recruiter' ? 'flex-1 flex flex-col' : 'hidden'}>
          <RecruiterView setCurrentTab={setCurrentTab} goVerify={goVerify} />
        </div>
        <div className={safeTab === 'verification' ? 'flex-1 flex flex-col' : 'hidden'}>
          <VerificationView
            setCurrentTab={setCurrentTab}
            initialQuery={auditQuery}
            onQueryConsumed={setAuditQuery}
          />
        </div>
      </main>
    </div>
  )
}

export default App
