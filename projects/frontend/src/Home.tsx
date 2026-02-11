/**
 * Home.tsx — EventLens main layout with role-based routing.
 * Students see: Events + My Badges
 * Admins see:   Events + My Badges + Admin Dashboard
 * Role is checked server-side via /is-admin endpoint.
 */

import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState, useEffect, useCallback } from 'react'
import ConnectWallet from './components/ConnectWallet'
import EventList from './components/EventList'
import Profile from './components/Profile'
import AdminDashboard from './components/AdminDashboard'
import { fetchStats, checkIsAdmin, PlatformStats } from './utils/api'

type Tab = 'events' | 'profile' | 'admin'

const Home: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('events')
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [roleLoading, setRoleLoading] = useState(false)
  const { activeAddress } = useWallet()

  // Check role whenever wallet changes
  useEffect(() => {
    if (activeAddress) {
      setRoleLoading(true)
      checkIsAdmin(activeAddress)
        .then(setIsAdmin)
        .finally(() => setRoleLoading(false))
    } else {
      setIsAdmin(false)
      setRoleLoading(false)
    }
  }, [activeAddress])

  // If wallet disconnects or switches to non-admin, kick off admin tab
  useEffect(() => {
    if (activeTab === 'admin' && !isAdmin) {
      setActiveTab('events')
    }
  }, [isAdmin, activeTab])

  // Fetch stats for hero
  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => {})
  }, [activeTab])

  // Build visible tabs based on role
  const visibleTabs = useCallback((): { tab: Tab; label: string; icon: string }[] => {
    const tabs: { tab: Tab; label: string; icon: string }[] = [
      { tab: 'events', label: 'Events', icon: '📋' },
      { tab: 'profile', label: 'My Badges', icon: '🏅' },
    ]
    if (isAdmin) {
      tabs.push({ tab: 'admin', label: 'Admin', icon: '🛡️' })
    }
    return tabs
  }, [isAdmin])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50 to-fuchsia-50">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/80 border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('events')}>
            <span className="text-2xl">🔭</span>
            <h1 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
              EventLens
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-1">
            {visibleTabs().map(({ tab, label }) => (
              <button
                key={tab}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                onClick={() => setActiveTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Role badge */}
            {activeAddress && !roleLoading && (
              <span
                className={`hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  isAdmin ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}
              >
                {isAdmin ? '🛡️ Admin' : '🎓 Student'}
              </span>
            )}

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
        </div>
      </nav>

      {/* ── Hero Section — Judges see this first ──────────── */}
      {activeTab === 'events' && (
        <div className="relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 py-12 sm:py-16">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                </span>
                Live on Algorand TestNet
              </div>

              <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight">
                Prove attendance.
                <br />
                <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                  Earn soulbound badges.
                </span>
              </h2>

              <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
                Multi-layer AI-verified event attendance on Algorand. Take a photo, get verified by Gemini Vision + GPS geo-fencing + EXIF
                analysis + image hashing, and receive a soulbound badge NFT with on-chain proof — all in under 60 seconds.
              </p>

              {/* Flow Diagram */}
              <div className="flex items-center justify-center gap-2 sm:gap-4 mt-8 flex-wrap">
                {[
                  { icon: '🔗', label: 'Connect Wallet' },
                  { icon: '📸', label: 'Upload Photo' },
                  { icon: '🤖', label: 'Multi-Layer AI' },
                  { icon: '🏆', label: 'Get Badge NFT' },
                ].map((step, i) => (
                  <React.Fragment key={step.label}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white shadow-md border border-gray-100 flex items-center justify-center text-2xl sm:text-3xl">
                        {step.icon}
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-gray-600">{step.label}</span>
                    </div>
                    {i < 3 && (
                      <svg
                        className="w-5 h-5 text-gray-300 mt-[-20px] hidden sm:block"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Live Stats */}
              {stats && (stats.total_events > 0 || stats.total_badges_minted > 0) && (
                <div className="flex items-center justify-center gap-6 sm:gap-10 mt-10">
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total_events}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Events</div>
                  </div>
                  <div className="w-px h-10 bg-gray-200" />
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-violet-600">{stats.total_badges_minted}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Badges Minted</div>
                  </div>
                  <div className="w-px h-10 bg-gray-200" />
                  <div className="text-center">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.unique_attendees}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">Attendees</div>
                  </div>
                </div>
              )}

              {!activeAddress && (
                <button
                  className="btn mt-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white border-none px-8 py-3 text-lg rounded-xl shadow-lg hover:opacity-90 hover:shadow-xl transition-all"
                  onClick={() => setOpenWalletModal(true)}
                >
                  Connect Wallet to Start
                </button>
              )}
            </div>
          </div>
          {/* Decorative gradient blobs */}
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-violet-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-fuchsia-200 rounded-full opacity-20 blur-3xl pointer-events-none" />
        </div>
      )}

      {/* ── Mobile Tab Bar — Role-aware ────────────────────── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 flex">
        {visibleTabs().map(({ tab, icon, label }) => (
          <button
            key={tab}
            className={`flex-1 py-3 text-center text-xs font-medium ${
              activeTab === tab ? 'text-violet-600 bg-violet-50' : 'text-gray-400'
            }`}
            onClick={() => setActiveTab(tab)}
          >
            <div className="text-lg">{icon}</div>
            {label}
          </button>
        ))}
      </div>

      {/* ── Main Content ──────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-8 pb-24 sm:pb-8">
        {activeTab === 'events' && <EventList />}
        {activeTab === 'profile' && <Profile />}
        {activeTab === 'admin' && isAdmin && <AdminDashboard />}
      </main>

      <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
    </div>
  )
}

export default Home
