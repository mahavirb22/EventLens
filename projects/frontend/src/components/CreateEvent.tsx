/**
 * CreateEvent.tsx — Admin panel to create new events.
 * Each event mints a new ASA on Algorand TestNet.
 * Now supports date/time ranges and GPS coordinates for geo-fencing.
 */

import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { createEvent, EventData, getUserLocation } from '../utils/api'

interface Props {
  adminToken: string
  onCreated?: (event: EventData) => void
}

const CreateEvent: React.FC<Props> = ({ adminToken, onCreated }) => {
  const { activeAddress } = useWallet()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState<string>('')
  const [longitude, setLongitude] = useState<string>('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [totalBadges, setTotalBadges] = useState(100)
  const [loading, setLoading] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<EventData | null>(null)

  const handleGetLocation = async () => {
    setGeoLoading(true)
    const loc = await getUserLocation()
    if (loc) {
      setLatitude(loc.latitude.toFixed(6))
      setLongitude(loc.longitude.toFixed(6))
    } else {
      setError('Could not get GPS location. Please enter manually.')
    }
    setGeoLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !description || !location) {
      setError('Name, description, and location are required')
      return
    }
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const event = await createEvent({
        name,
        description,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        date_start: dateStart ? new Date(dateStart).toISOString() : '',
        date_end: dateEnd ? new Date(dateEnd).toISOString() : '',
        total_badges: totalBadges,
        admin_wallet: activeAddress || '',
        admin_token: adminToken,
      })
      setSuccess(event)
      setName('')
      setDescription('')
      setLocation('')
      setLatitude('')
      setLongitude('')
      setDateStart('')
      setDateEnd('')
      setTotalBadges(100)
      onCreated?.(event)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Create New Event</h2>

      <form onSubmit={handleSubmit} className="card bg-white shadow-md border border-gray-100">
        <div className="card-body space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Event Name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. VIT Blockchain Workshop"
              className="input input-bordered w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={32}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Description</span>
            </label>
            <textarea
              placeholder="Brief event description..."
              className="textarea textarea-bordered w-full"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Location</span>
            </label>
            <input
              type="text"
              placeholder="e.g. VIT Vellore, Auditorium Hall A"
              className="input input-bordered w-full"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {/* Date/Time Range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Start Date/Time</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">End Date/Time</span>
              </label>
              <input
                type="datetime-local"
                className="input input-bordered w-full"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
              />
            </div>
          </div>

          {/* GPS Coordinates for Geo-Fencing */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">
                Venue GPS Coordinates
                <span className="text-xs text-gray-400 ml-2">(for geo-fencing)</span>
              </span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              <input
                type="text"
                placeholder="Latitude"
                className="input input-bordered col-span-2"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
              <input
                type="text"
                placeholder="Longitude"
                className="input input-bordered col-span-2"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm h-full"
                onClick={handleGetLocation}
                disabled={geoLoading}
                title="Use current GPS location"
              >
                {geoLoading ? <span className="loading loading-spinner loading-xs"></span> : '📍'}
              </button>
            </div>
            <label className="label">
              <span className="label-text-alt text-gray-400">Click 📍 to auto-fill from your current location</span>
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Total Badges</span>
            </label>
            <input
              type="number"
              className="input input-bordered w-full"
              value={totalBadges}
              onChange={(e) => setTotalBadges(Number(e.target.value))}
              min={1}
              max={10000}
            />
          </div>

          {error && (
            <div className="alert alert-error text-sm py-2">
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert alert-success text-sm py-2">
              <div>
                <p className="font-medium">Event created!</p>
                <p>
                  ID: {success.id} | ASA: {success.asset_id}
                </p>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? (
              <>
                <span className="loading loading-spinner loading-sm"></span> Creating on Algorand...
              </>
            ) : (
              'Create Event & Mint ASA'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateEvent
