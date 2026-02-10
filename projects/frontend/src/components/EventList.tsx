/**
 * EventList.tsx — Lists all events available for attendance verification.
 * Clean card grid. Mobile responsive. Click to open event detail.
 */

import React, { useEffect, useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { fetchEvents, EventData } from '../utils/api'
import EventDetail from './EventDetail'

const EventList: React.FC = () => {
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const { activeAddress } = useWallet()

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      const data = await fetchEvents()
      setEvents(data)
    } catch (e) {
      // silently fail — events will show as empty
    } finally {
      setLoading(false)
    }
  }

  if (selectedEvent) {
    return (
      <EventDetail
        event={selectedEvent}
        onBack={() => {
          setSelectedEvent(null)
          loadEvents() // refresh counts
        }}
      />
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Active Events</h2>
        <span className="badge badge-lg badge-primary">{events.length} events</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No events yet. Create one from the admin panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((event) => (
            <div
              key={event.id}
              className="card bg-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer border border-gray-100"
              onClick={() => setSelectedEvent(event)}
            >
              <div className="card-body">
                {/* Gradient accent bar */}
                <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full -mt-2 mb-3" />

                <h3 className="card-title text-gray-800">{event.name}</h3>
                <p className="text-gray-500 text-sm line-clamp-2">{event.description}</p>

                <div className="flex items-center gap-2 mt-2 text-sm text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{event.location}</span>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-medium text-gray-500">Claimed:</span>
                    <span className="badge badge-sm badge-ghost">
                      {event.minted}/{event.total_badges}
                    </span>
                  </div>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={!activeAddress}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEvent(event)
                    }}
                  >
                    {activeAddress ? 'Verify' : 'Connect Wallet'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EventList
