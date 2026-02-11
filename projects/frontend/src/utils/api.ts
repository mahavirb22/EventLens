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
  latitude: number | null
  longitude: number | null
  date_start: string
  date_end: string
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
  image_hash: string
  geo_check: string | null
}

export interface MintResponse {
  success: boolean
  tx_id: string
  asset_id: number
  message: string
  explorer_url: string
  proof_recorded: boolean
}

export interface ProfileBadge {
  asset_id: number
  event_name: string
  event_id: string
  amount: number
  claimed_at: string
  image_hash: string
  ai_confidence: number
}

export interface PlatformStats {
  total_events: number
  total_badges_minted: number
  total_badges_available: number
  unique_attendees: number
}

// ── Geolocation Helper ───────────────────────────────────

export function getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  })
}

// ── API Functions ──────────────────────────────────────────

export async function checkIsAdmin(wallet: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/is-admin?wallet=${wallet}`)
    if (!res.ok) return false
    const data = await res.json()
    return data.is_admin === true
  } catch {
    return false
  }
}

export async function adminLogin(password: string, wallet: string = ''): Promise<{ success: boolean; admin_token: string }> {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, wallet }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }))
    throw new Error(err.detail || 'Invalid admin password')
  }
  return res.json()
}

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
  latitude?: number | null
  longitude?: number | null
  date_start?: string
  date_end?: string
  total_badges: number
  admin_wallet: string
  admin_token: string
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

export async function verifyAttendance(
  eventId: string,
  walletAddress: string,
  imageFile: File,
  location?: { latitude: number; longitude: number } | null,
): Promise<VerifyResponse> {
  const formData = new FormData()
  formData.append('event_id', eventId)
  formData.append('wallet_address', walletAddress)
  formData.append('image', imageFile)
  if (location) {
    formData.append('latitude', location.latitude.toString())
    formData.append('longitude', location.longitude.toString())
  }

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
