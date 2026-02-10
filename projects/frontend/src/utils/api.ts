/**
 * api.ts — Centralized API client for EventLens backend.
 * All backend calls go through here. Clean, typed, no magic.
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Types ──────────────────────────────────────────────────

export interface EventData {
  id: string
  name: string
  description: string
  location: string
  asset_id: number
  total_badges: number
  minted: number
  created_at: string
}

export interface VerifyResponse {
  success: boolean
  confidence: number
  message: string
  eligible: boolean
  verify_token: string
}

export interface MintResponse {
  success: boolean
  tx_id: string
  asset_id: number
  message: string
  explorer_url: string
}

export interface ProfileBadge {
  asset_id: number
  event_name: string
  event_id: string
  amount: number
  claimed_at: string
}

export interface PlatformStats {
  total_events: number
  total_badges_minted: number
  total_badges_available: number
  unique_attendees: number
}

// ── API Functions ──────────────────────────────────────────

export async function fetchStats(): Promise<PlatformStats> {
  const res = await fetch(`${API_BASE}/stats`)
  if (!res.ok) return { total_events: 0, total_badges_minted: 0, total_badges_available: 0, unique_attendees: 0 }
  return res.json()
}

export async function fetchEvents(): Promise<EventData[]> {
  const res = await fetch(`${API_BASE}/events`)
  if (!res.ok) throw new Error('Failed to fetch events')
  return res.json()
}

export async function fetchEvent(eventId: string): Promise<EventData> {
  const res = await fetch(`${API_BASE}/events/${eventId}`)
  if (!res.ok) throw new Error('Event not found')
  return res.json()
}

export async function createEvent(data: {
  name: string
  description: string
  location: string
  total_badges: number
  admin_wallet: string
}): Promise<EventData> {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || 'Failed to create event')
  }
  return res.json()
}

export async function checkOptIn(eventId: string, wallet: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/events/${eventId}/opt-in-check?wallet=${wallet}`)
  if (!res.ok) return false
  const data = await res.json()
  return data.opted_in
}

export async function verifyAttendance(eventId: string, walletAddress: string, imageFile: File): Promise<VerifyResponse> {
  const formData = new FormData()
  formData.append('event_id', eventId)
  formData.append('wallet_address', walletAddress)
  formData.append('image', imageFile)

  const res = await fetch(`${API_BASE}/verify-attendance`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Verification failed' }))
    throw new Error(err.detail || 'Verification failed')
  }
  return res.json()
}

export async function mintBadge(eventId: string, walletAddress: string, verifyToken: string): Promise<MintResponse> {
  const res = await fetch(`${API_BASE}/mint-badge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_id: eventId,
      wallet_address: walletAddress,
      verify_token: verifyToken,
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Minting failed' }))
    throw new Error(err.detail || 'Minting failed')
  }
  return res.json()
}

export async function fetchProfileBadges(walletAddress: string): Promise<ProfileBadge[]> {
  const res = await fetch(`${API_BASE}/profile/${walletAddress}/badges`)
  if (!res.ok) return []
  return res.json()
}
