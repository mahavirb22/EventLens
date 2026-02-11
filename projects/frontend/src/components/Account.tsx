import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'

const Account: React.FC = () => {
  const { activeAddress, wallets } = useWallet()
  const [copied, setCopied] = useState(false)

  if (!activeAddress) return null

  const activeWallet = wallets?.find((wallet) => wallet.isActive)
  const walletName = activeWallet?.metadata?.name || 'Connected Wallet'
  const walletIcon = activeWallet?.metadata?.icon

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeAddress)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {walletIcon && (
            <img alt={`${walletName} icon`} src={walletIcon} style={{ objectFit: 'contain', width: '22px', height: '22px' }} />
          )}
          <div>
            <div className="text-xs text-gray-400">Wallet</div>
            <div className="text-sm font-semibold text-gray-700">{walletName}</div>
          </div>
        </div>
        <button type="button" className="btn btn-ghost btn-xs" onClick={handleCopy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="mt-3 font-mono text-xs text-gray-500 break-all">{activeAddress}</div>
    </div>
  )
}

export default Account
