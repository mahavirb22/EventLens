/**
 * EventDetail.tsx — Full event page with the core EventLens flow:
 *   1. Opt-In to the badge ASA
 *   2. Upload photo + capture GPS location
 *   3. AI verifies → composite confidence score (Vision + Geo + EXIF)
 *   4. Claim soulbound badge + record on-chain proof
 *
 * This is the hero component of the entire dApp.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import algosdk from 'algosdk'
import { EventData, checkOptIn, verifyAttendance, mintBadge, VerifyResponse, MintResponse, getUserLocation } from '../utils/api'
import { launchConfetti } from '../utils/confetti'

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
  const [studentName, setStudentName] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [verifyResult, setVerifyResult] = useState<VerifyResponse | null>(null)
  const [verifyToken, setVerifyToken] = useState('')
  const [mintResult, setMintResult] = useState<MintResponse | null>(null)
  const [error, setError] = useState('')
  const [geoStatus, setGeoStatus] = useState<string>('pending')
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

  // Check if event is currently active (time-based)
  const isEventActive = (): boolean => {
    if (!event.date_start && !event.date_end) return true // No dates = always active
    const now = new Date()
    if (event.date_start && new Date(event.date_start) > now) return false
    if (event.date_end && new Date(event.date_end) < now) return false
    return true
  }

  const formatEventDate = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // ── Opt-In: build txn server-side, sign client-side ──────
  const handleOptIn = async () => {
    if (!activeAddress || !transactionSigner) return
    setOptingIn(true)
    setError('')

    try {
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

  // ── AI Verification with Geolocation ─────────────────────
  const handleVerify = async () => {
    if (!imageFile || !activeAddress) return
    setStep('verifying')
    setError('')

    try {
      // Capture GPS location in parallel with verification
      setGeoStatus('acquiring')
      const location = await getUserLocation()
      setGeoStatus(location ? 'acquired' : 'unavailable')

      const result = await verifyAttendance(event.id, activeAddress, studentName, imageFile, location)
      setVerifyResult(result)
      if (result.verify_token) setVerifyToken(result.verify_token)
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
      const result = await mintBadge(event.id, activeAddress, verifyToken)
      setMintResult(result)
      setStep('done')
      launchConfetti()
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

  const geoIcon = (status: string | null) => {
    if (status === 'pass') return '✅'
    if (status === 'fail') return '❌'
    return '⚠️'
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
        <div className="flex flex-wrap items-center gap-4 mt-4 text-sm opacity-80">
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
          {event.date_start && (
            <span className="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatEventDate(event.date_start)}
            </span>
          )}
          <span>ASA: {event.asset_id}</span>
          <span>
            {event.minted}/{event.total_badges} claimed
          </span>
        </div>

        {/* Event status badge */}
        {event.date_start && (
          <div className="mt-3">
            {isEventActive() ? (
              <span className="inline-flex items-center gap-1.5 bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                </span>
                Live Now
              </span>
            ) : new Date(event.date_start) > new Date() ? (
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">Upcoming</span>
            ) : (
              <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">Ended</span>
            )}
          </div>
        )}

        {/* Geo-fencing indicator */}
        {event.latitude && event.longitude && (
          <div className="mt-2 text-xs opacity-70 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            GPS geo-fenced — location verification enabled
          </div>
        )}
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
            <p className="text-gray-500 mt-2">Take a live photo at the event venue. Our AI will verify with multi-layer analysis.</p>

            {/* Verification layers indicator */}
            <div className="flex flex-wrap gap-2 mt-3 justify-center">
              <span className="badge badge-outline badge-sm gap-1">🤖 AI Vision</span>
              <span className="badge badge-outline badge-sm gap-1">📍 GPS Check</span>
              <span className="badge badge-outline badge-sm gap-1">📷 EXIF Analysis</span>
              <span className="badge badge-outline badge-sm gap-1">🔐 Image Hash</span>
            </div>

            {/* Student Name Input */}
            <div className="w-full max-w-md mt-4">
              <label className="label">
                <span className="label-text font-medium">Your Full Name</span>
              </label>
              <input
                type="text"
                placeholder="Enter your full name for certificate"
                className="input input-bordered w-full"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </div>

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

            <button className="btn btn-primary mt-4 w-full max-w-xs" onClick={handleVerify} disabled={!imageFile || !studentName.trim()}>
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
            <h3 className="text-xl font-semibold mt-4">Running multi-layer verification...</h3>
            <div className="flex flex-col gap-1 mt-3 text-sm text-gray-400">
              <span>🤖 Gemini AI analyzing your photo...</span>
              <span>
                📍 {geoStatus === 'acquired' ? 'GPS location captured' : geoStatus === 'acquiring' ? 'Acquiring GPS...' : 'GPS unavailable'}
              </span>
              <span>📷 Extracting EXIF metadata...</span>
              <span>🔐 Computing image hash...</span>
            </div>
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
                <span className="font-medium text-gray-700">Composite Confidence</span>
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

            {/* Verification layers breakdown */}
            <div className="w-full max-w-sm mt-3 flex flex-wrap justify-center gap-2">
              {verifyResult.geo_check && (
                <span
                  className={`badge ${
                    verifyResult.geo_check === 'pass'
                      ? 'badge-success'
                      : verifyResult.geo_check === 'fail'
                        ? 'badge-error'
                        : 'badge-warning'
                  } badge-sm gap-1`}
                >
                  {geoIcon(verifyResult.geo_check)} GPS {verifyResult.geo_check}
                </span>
              )}
              {verifyResult.image_hash && (
                <span className="badge badge-ghost badge-sm gap-1 cursor-help" title={`SHA-256: ${verifyResult.image_hash}`}>
                  🔐 Hash: {verifyResult.image_hash.slice(0, 8)}...
                </span>
              )}
            </div>

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
            <p className="text-gray-400">Sending transaction to Algorand TestNet + recording on-chain proof</p>
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
                <div className="flex justify-between">
                  <span className="text-gray-400">On-chain Proof:</span>
                  <span className={`font-medium ${mintResult.proof_recorded ? 'text-green-600' : 'text-gray-400'}`}>
                    {mintResult.proof_recorded ? '✅ Recorded' : '⏳ Pending'}
                  </span>
                </div>
                {verifyResult?.image_hash && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Image Hash:</span>
                    <span className="font-mono text-xs truncate max-w-[180px]" title={verifyResult.image_hash}>
                      {verifyResult.image_hash.slice(0, 16)}...
                    </span>
                  </div>
                )}
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

            {/* Certificate Display */}
            {mintResult.certificate_url && (
              <div className="mt-6 w-full max-w-2xl">
                <h4 className="text-lg font-semibold mb-3">🎓 Your Attendance Certificate</h4>
                <div className="bg-white rounded-lg shadow-lg p-2 border border-gray-200">
                  <img src={mintResult.certificate_url} alt="Attendance Certificate" className="w-full rounded" />
                </div>
                <a
                  href={mintResult.certificate_url}
                  download={`${event.name.replace(/\s+/g, '_')}_Certificate.png`}
                  className="btn btn-success btn-sm mt-3 gap-1"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download Certificate
                </a>
              </div>
            )}

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
