/**
 * Home.tsx — EventLens main layout.
 * Tab-based navigation: Events | Profile | Admin
 * Clean, minimal, mobile-first.
 */

import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import EventList from './components/EventList'
import Profile from './components/Profile'
import CreateEvent from './components/CreateEvent'

type Tab = 'events' | 'profile' | 'admin'

const Home: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('events')
  const { activeAddress } = useWallet()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-fuchsia-50">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔭</span>
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              EventLens
            </h1>
          </div>

          {/* Nav Tabs */}
          <div className="hidden sm:flex items-center gap-1">
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'events' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('events')}
            >
              Events
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'profile' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('profile')}
            >
              My Badges
            </button>
            <button
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'admin' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setActiveTab('admin')}
            >
              Admin
            </button>
          </div>

          {/* Wallet Connect */}
          <button
            data-test-id="connect-wallet"
            className={`btn btn-sm rounded-full px-5 shadow-sm ${
              activeAddress
                ? 'btn-outline border-green-400 text-green-600 hover:bg-green-50'
                : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-none hover:opacity-90'
            }`}
            onClick={() => setOpenWalletModal(true)}
          >
            {activeAddress ? `${activeAddress.slice(0, 4)}...${activeAddress.slice(-4)}` : 'Connect Wallet'}
          </button>
        </div>
      </nav>

      {/* ── Mobile Tab Bar ─────────────────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
        <button
          className={`flex-1 py-3 text-center text-xs font-medium ${
            activeTab === 'events' ? 'text-violet-600 bg-violet-50' : 'text-gray-400'
          }`}
          onClick={() => setActiveTab('events')}
        >
          <div className="text-lg">📋</div>
          Events
        </button>
        <button
          className={`flex-1 py-3 text-center text-xs font-medium ${
            activeTab === 'profile' ? 'text-violet-600 bg-violet-50' : 'text-gray-400'
          }`}
          onClick={() => setActiveTab('profile')}
        >
          <div className="text-lg">🏅</div>
          Badges
        </button>
        <button
          className={`flex-1 py-3 text-center text-xs font-medium ${
            activeTab === 'admin' ? 'text-violet-600 bg-violet-50' : 'text-gray-400'
          }`}
          onClick={() => setActiveTab('admin')}
        >
          <div className="text-lg">⚙️</div>
          Admin
        </button>
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 sm:pb-8">
        {activeTab === 'events' && <EventList />}
        {activeTab === 'profile' && <Profile />}
        {activeTab === 'admin' && <CreateEvent />}
      </main>

      {/* ── Wallet Modal (reusing existing component) ─────── */}
      <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
    </div>
  )
}

export default Home
