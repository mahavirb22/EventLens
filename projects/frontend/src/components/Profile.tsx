/**
 * Profile.tsx — Shows all soulbound badges earned by the connected wallet.
 * Queries the backend which merges on-chain + event store data.
 */

import React, { useEffect, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { fetchProfileBadges, ProfileBadge } from '../utils/api'

const Profile: React.FC = () => {
  const { activeAddress } = useWallet()
  const [badges, setBadges] = useState<ProfileBadge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (activeAddress) {
      setLoading(true)
      fetchProfileBadges(activeAddress)
        .then(setBadges)
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setBadges([])
      setLoading(false)
    }
  }, [activeAddress])

  if (!activeAddress) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔗</div>
        <h3 className="text-xl font-semibold text-gray-700">Connect Your Wallet</h3>
        <p className="text-gray-400 mt-2">Connect your Pera wallet to view your attendance badges.</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Badges</h2>
        <div className="text-right">
          <span className="text-xs text-gray-400">Connected as</span>
          <p className="font-mono text-sm text-gray-600 truncate max-w-[200px]">
            {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : badges.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <div className="text-5xl mb-4">🏅</div>
          <h3 className="text-xl font-semibold text-gray-700">No Badges Yet</h3>
          <p className="text-gray-400 mt-2">Attend events and verify your presence to earn soulbound badges!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {badges.map((badge) => (
            <div
              key={badge.asset_id}
              className="card bg-gradient-to-br from-violet-50 to-fuchsia-50 shadow-md border border-violet-100 hover:shadow-lg transition-shadow"
            >
              <div className="card-body items-center text-center">
                <div className="text-4xl mb-2">🏆</div>
                <h3 className="card-title text-gray-800 text-lg">{badge.event_name}</h3>

                <div className="badge badge-primary badge-sm mt-2">Soulbound</div>

                <div className="w-full mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Asset ID:</span>
                    <a
                      href={`https://testnet.explorer.perawallet.app/asset/${badge.asset_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-primary hover:underline"
                    >
                      {badge.asset_id}
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Quantity:</span>
                    <span className="font-medium">{badge.amount}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Profile
