/**
 * EventDetail.tsx — Full event page with the core EventLens flow:
 *   1. Opt-In to the badge ASA
 *   2. Upload photo
 *   3. AI verifies → confidence score
 *   4. Claim soulbound badge
 *
 * This is the hero component of the entire dApp.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { EventData, checkOptIn, verifyAttendance, mintBadge, VerifyResponse, MintResponse } from '../utils/api'

interface Props {
  event: EventData
  onBack: () => void
}

type Step = 'opt-in' | 'upload' | 'verifying' | 'result' | 'minting' | 'done'

const EventDetail: React.FC<Props> = ({ event, onBack }) => {
  const { activeAddress, transactionSigner } = useWallet()
  const [step, setStep] = useState<Step>('opt-in')
  const [optedIn, setOptedIn] = useState(false)
  const [optingIn, setOptingIn] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null)
  const [mintResult, setMintResult] = useState<MintResponse | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check opt-in status on mount
  useEffect(() => {
    if (activeAddress) {
      checkOptIn(event.id, activeAddress).then((opted) => {
        setOptedIn(opted)
        if (opted) setStep('upload')
      })
    }
  }, [activeAddress, event.id])

  // ── Opt-In: build txn server-side, sign client-side ──────
  const handleOptIn = async () => {
    if (!activeAddress || !transactionSigner) return
    setOptingIn(true)
    setError('')

    try {
      // Build the opt-in txn (self-transfer of 0 units)
      const algodServer = import.meta.env.VITE_ALGOD_SERVER || 'https://testnet-api.algonode.cloud'
      const algodToken = import.meta.env.VITE_ALGOD_TOKEN || ''
      const algodPort = import.meta.env.VITE_ALGOD_PORT || '443'
      const client = new algosdk.Algodv2(algodToken, algodServer, algodPort)

      const sp = await client.getTransactionParams().do()
      const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: activeAddress,
        amount: 0,
        assetIndex: event.asset_id,
        suggestedParams: sp,
      })

      // Sign with user's wallet (Pera/Defly)
      const signedTxns = await transactionSigner([txn], [0])
      const { txid } = await client.sendRawTransaction(signedTxns[0]).do()
      await algosdk.waitForConfirmation(client, txid, 4)

      setOptedIn(true)
      setStep('upload')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Opt-in failed')
    } finally {
      setOptingIn(false)
    }
  }

  // ── Image Upload ─────────────────────────────────────────
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  // ── AI Verification ─────────────────────────────────────
  const handleVerify = async () => {
    if (!imageFile || !activeAddress) return
    setStep('verifying')
    setError('')

    try {
      const result = await verifyAttendance(event.id, activeAddress, imageFile)
      setVerifyResult(result)
      setStep('result')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed')
      setStep('upload')
    }
  }

  // ── Mint Badge ──────────────────────────────────────────
  const handleMint = async () => {
    if (!activeAddress) return
    setStep('minting')
    setError('')

    try {
      const result = await mintBadge(event.id, activeAddress)
      setMintResult(result)
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Minting failed')
      setStep('result')
    }
  }

  // ── Confidence Bar Color ────────────────────────────────
  const getConfColor = (score: number) => {
    if (score >= 80) return 'bg-green-500'
    if (score >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Back Button */}
      <button onClick={onBack} className="btn btn-ghost btn-sm mb-4 gap-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Events
      </button>

      {/* Event Header */}
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <h1 className="text-3xl font-bold">{event.name}</h1>
        <p className="mt-2 opacity-90">{event.description}</p>
        <div className="flex items-center gap-4 mt-4 text-sm opacity-80">
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
            </svg>
            {event.location}
          </span>
          <span>Badge ASA: {event.asset_id}</span>
          <span>
            {event.minted}/{event.total_badges} claimed
          </span>
        </div>
      </div>

      {/* Progress Steps */}
      <ul className="steps steps-horizontal w-full mb-8">
        <li className={`step ${step !== 'opt-in' || optedIn ? 'step-primary' : ''}`}>Opt-In</li>
        <li className={`step ${['upload', 'verifying', 'result', 'minting', 'done'].includes(step) ? 'step-primary' : ''}`}>Upload</li>
        <li className={`step ${['result', 'minting', 'done'].includes(step) ? 'step-primary' : ''}`}>Verify</li>
        <li className={`step ${step === 'done' ? 'step-primary' : ''}`}>Badge</li>
      </ul>

      {/* Error Banner */}
      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* ── Step 1: Opt-In ──────────────────────────────── */}
      {step === 'opt-in' && (
        <div className="card bg-white shadow-md border border-gray-100">
          <div className="card-body items-center text-center">
            <h3 className="card-title text-xl">Step 1: Opt-In to Badge ASA</h3>
            <p className="text-gray-500 mt-2">
              Your wallet needs to opt-in to receive the soulbound attendance badge. This is a standard Algorand ASA opt-in (costs 0.1 ALGO
              for minimum balance).
            </p>
            <button className="btn btn-primary mt-4 gap-2" onClick={handleOptIn} disabled={optingIn || !activeAddress}>
              {optingIn ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span> Signing...
                </>
              ) : (
                'Opt-In to Badge'
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Upload Photo ────────────────────────── */}
      {step === 'upload' && (
        <div className="card bg-white shadow-md border border-gray-100">
          <div className="card-body items-center text-center">
            <h3 className="card-title text-xl">Step 2: Prove Your Attendance</h3>
            <p className="text-gray-500 mt-2">Take a live photo at the event venue. Our AI will verify authenticity.</p>

            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />

            {imagePreview ? (
              <div className="mt-4 relative">
                <img src={imagePreview} alt="Preview" className="rounded-xl max-h-64 object-cover shadow-md" />
                <button
                  className="btn btn-circle btn-sm btn-error absolute top-2 right-2"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview('')
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div
                className="mt-4 border-2 border-dashed border-gray-300 rounded-xl p-12 cursor-pointer hover:border-primary transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-gray-400 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-400 mt-2">Click to upload or take a photo</p>
              </div>
            )}

            <button className="btn btn-primary mt-4 w-full max-w-xs" onClick={handleVerify} disabled={!imageFile}>
              Verify with AI
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Verifying (loading) ─────────────────── */}
      {step === 'verifying' && (
        <div className="card bg-white shadow-md border border-gray-100">
          <div className="card-body items-center text-center py-12">
            <span className="loading loading-ring loading-lg text-primary"></span>
            <h3 className="text-xl font-semibold mt-4">Analyzing your photo...</h3>
            <p className="text-gray-400">Gemini AI is verifying attendance authenticity</p>
          </div>
        </div>
      )}

      {/* ── Step 4: Verification Result ─────────────────── */}
      {step === 'result' && verifyResult && (
        <div className="card bg-white shadow-md border border-gray-100">
          <div className="card-body items-center text-center">
            <h3 className="card-title text-xl">Verification Result</h3>

            {/* Confidence Score Bar */}
            <div className="w-full max-w-sm mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Confidence Score</span>
                <span className="font-bold text-lg">{verifyResult.confidence}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-1000 ${getConfColor(verifyResult.confidence)}`}
                  style={{ width: `${verifyResult.confidence}%` }}
                />
              </div>
            </div>

            <p className="text-gray-500 mt-3 italic">"{verifyResult.message}"</p>

            {verifyResult.eligible ? (
              <div className="mt-4">
                <div className="badge badge-success badge-lg gap-1 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Eligible for Badge
                </div>
                <button className="btn btn-primary btn-lg w-full max-w-xs" onClick={handleMint}>
                  Claim Soulbound Badge
                </button>
              </div>
            ) : (
              <div className="mt-4">
                <div className="badge badge-error badge-lg mb-3">Verification Failed</div>
                <p className="text-sm text-gray-400">Score must be 80% or higher to claim.</p>
                <button
                  className="btn btn-outline mt-3"
                  onClick={() => {
                    setImageFile(null)
                    setImagePreview('')
                    setVerifyResult(null)
                    setStep('upload')
                  }}
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Step 5: Minting ─────────────────────────────── */}
      {step === 'minting' && (
        <div className="card bg-white shadow-md border border-gray-100">
          <div className="card-body items-center text-center py-12">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <h3 className="text-xl font-semibold mt-4">Minting your soulbound badge...</h3>
            <p className="text-gray-400">Sending transaction to Algorand TestNet</p>
          </div>
        </div>
      )}

      {/* ── Step 6: Done! ───────────────────────────────── */}
      {step === 'done' && mintResult && (
        <div className="card bg-gradient-to-br from-green-50 to-emerald-50 shadow-md border border-green-200">
          <div className="card-body items-center text-center">
            {/* Success Animation */}
            <div className="text-6xl animate-bounce">🎉</div>
            <h3 className="text-2xl font-bold text-green-700 mt-2">Badge Claimed!</h3>
            <p className="text-gray-600 mt-1">Your soulbound attendance badge is now in your wallet.</p>

            <div className="bg-white rounded-lg p-4 mt-4 w-full max-w-sm shadow-sm">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Asset ID:</span>
                  <span className="font-mono font-medium">{mintResult.asset_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tx ID:</span>
                  <span className="font-mono text-xs truncate max-w-[180px]">{mintResult.tx_id}</span>
                </div>
              </div>
            </div>

            <a href={mintResult.explorer_url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm mt-4 gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
              View on Explorer
            </a>

            <button className="btn btn-primary mt-4" onClick={onBack}>
              Back to Events
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventDetail
