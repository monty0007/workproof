import { useState } from 'react'
import Navbar from './components/Navbar'
import HomeView from './views/HomeView'
import UserView from './views/UserView'
import RecruiterView from './views/RecruiterView'
import VerificationView from './views/VerificationView'
import { useMidnight } from './hooks/useMidnight.js'
import { useLocalStorage } from './hooks/useLocalStorage.js'

const VALID_TABS = ['home', 'user', 'recruiter', 'verification']

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
