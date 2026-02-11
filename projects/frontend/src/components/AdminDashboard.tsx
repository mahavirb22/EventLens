/**
 * AdminDashboard.tsx — Admin-only panel.
 * Shows platform stats overview, event management, and create-event form.
 * Only visible to wallets listed in ADMIN_WALLETS on the backend.
 */

import React, { useEffect, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { fetchStats, fetchEvents, adminLogin, PlatformStats, EventData } from '../utils/api'
import CreateEvent from './CreateEvent'

const ADMIN_TOKEN_KEY = 'eventlens_admin_token'

const AdminDashboard: React.FC = () => {
  const { activeAddress } = useWallet()
  const [stats, setStats] = useState<PlatformStats | null>(null)
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'overview' | 'create'>('overview')

  // Password gate state
  const [adminToken, setAdminToken] = useState<string>(localStorage.getItem(ADMIN_TOKEN_KEY) || '')
  const [password, setPassword] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState('')

  const loadData = () => {
    setLoading(true)
    Promise.all([fetchStats(), fetchEvents()])
      .then(([s, e]) => {
        setStats(s)
        setEvents(e)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadData()
  }, [])

  const formatDate = (iso: string) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      const result = await adminLogin(password, activeAddress || '')
      if (result.success && result.admin_token) {
        setAdminToken(result.admin_token)
        localStorage.setItem(ADMIN_TOKEN_KEY, result.admin_token)
        setPassword('')
      }
    } catch (err: unknown) {
      setLoginError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = () => {
    setAdminToken('')
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  }

  // ── Password Gate ───────────────────────────────────────
  if (!adminToken) {
    return (
      <div className="w-full max-w-md mx-auto mt-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Access</h2>
          <p className="text-sm text-gray-400 mt-2">Enter the admin password to continue</p>
        </div>
        <form onSubmit={handleAdminLogin} className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Admin Password</span>
            </label>
            <input
              type="password"
              placeholder="Enter admin password"
              className="input input-bordered w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
          {loginError && (
            <div className="alert alert-error text-sm py-2">
              <span>{loginError}</span>
            </div>
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={loginLoading || !password}>
            {loginLoading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span> Verifying...
              </>
            ) : (
              'Login as Admin'
            )}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
          <p className="text-sm text-gray-400 mt-1">Manage events, monitor participation</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Admin
          </span>
          {activeAddress && (
            <span className="font-mono text-xs text-gray-400">
              {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
            </span>
          )}
          <button
            onClick={handleLogout}
            className="ml-2 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
            title="Logout from admin"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Events</div>
            <div className="text-2xl font-bold text-violet-600 mt-1">{stats.total_events}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Badges Minted</div>
            <div className="text-2xl font-bold text-fuchsia-600 mt-1">{stats.total_badges_minted}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Badges Available</div>
            <div className="text-2xl font-bold text-gray-800 mt-1">{stats.total_badges_available}</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="text-xs text-gray-400 uppercase tracking-wide">Unique Attendees</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{stats.unique_attendees}</div>
          </div>
        </div>
      )}

      {/* Sub-nav: Overview / Create */}
      <div className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'overview' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => setView('overview')}
        >
          Event Overview
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'create' ? 'bg-violet-100 text-violet-700' : 'text-gray-500 hover:bg-gray-100'
          }`}
          onClick={() => setView('create')}
        >
          + Create Event
        </button>
      </div>

      {/* Create Event Form */}
      {view === 'create' && (
        <CreateEvent
          adminToken={adminToken}
          onCreated={() => {
            setView('overview')
            loadData()
          }}
        />
      )}

      {/* Events Table */}
      {view === 'overview' && (
        <>
          {loading ? (
            <div className="flex justify-center py-12">
              <span className="loading loading-spinner loading-lg text-primary"></span>
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-700">No Events Yet</h3>
              <p className="text-gray-400 mt-2">Create your first event to get started.</p>
              <button className="btn btn-primary mt-4" onClick={() => setView('create')}>
                Create Event
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-xs uppercase tracking-wider text-gray-400">Event</th>
                      <th className="text-xs uppercase tracking-wider text-gray-400">Location</th>
                      <th className="text-xs uppercase tracking-wider text-gray-400">Date</th>
                      <th className="text-xs uppercase tracking-wider text-gray-400">Features</th>
                      <th className="text-xs uppercase tracking-wider text-gray-400">ASA ID</th>
                      <th className="text-xs uppercase tracking-wider text-gray-400">Claimed</th>
                      <th className="text-xs uppercase tracking-wider text-gray-400">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev) => (
                      <tr key={ev.id} className="hover:bg-gray-50">
                        <td>
                          <div className="font-medium text-gray-800">{ev.name}</div>
                          <div className="text-xs text-gray-400 truncate max-w-[200px]">{ev.description}</div>
                        </td>
                        <td className="text-sm text-gray-600">{ev.location}</td>
                        <td className="text-sm text-gray-500">{ev.date_start ? formatDate(ev.date_start) : '—'}</td>
                        <td>
                          <div className="flex gap-1">
                            {ev.latitude && ev.longitude && (
                              <span className="badge badge-xs badge-outline badge-primary" title="Geo-fenced">
                                📍
                              </span>
                            )}
                            <span className="badge badge-xs badge-outline badge-secondary" title="AI Verified">
                              🤖
                            </span>
                          </div>
                        </td>
                        <td>
                          <a
                            href={`https://testnet.explorer.perawallet.app/asset/${ev.asset_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-primary hover:underline"
                          >
                            {ev.asset_id}
                          </a>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-violet-500 h-2 rounded-full transition-all"
                                style={{ width: `${ev.total_badges > 0 ? (ev.minted / ev.total_badges) * 100 : 0}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {ev.minted}/{ev.total_badges}
                            </span>
                          </div>
                        </td>
                        <td className="text-sm text-gray-400">{formatDate(ev.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default AdminDashboard
