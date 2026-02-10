/**
 * CreateEvent.tsx — Admin panel to create new events.
 * Each event mints a new ASA on Algorand TestNet.
 */

import React, { useState } from 'react'
import { createEvent, EventData } from '../utils/api'

interface Props {
  onCreated?: (event: EventData) => void
}

const CreateEvent: React.FC<Props> = ({ onCreated }) => {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [totalBadges, setTotalBadges] = useState(100)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<EventData | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !description || !location) {
      setError('All fields are required')
      return
    }
    setLoading(true)
    setError('')
    setSuccess(null)

    try {
      const event = await createEvent({ name, description, location, total_badges: totalBadges })
      setSuccess(event)
      setName('')
      setDescription('')
      setLocation('')
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
