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
    <div className="w-full fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-4xl font-bold gradient-text mb-1">Active Events</h2>
          <p className="text-gray-500">Join events and earn blockchain-verified certificates</p>
        </div>
        <span className="badge badge-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 shadow-lg">
          {events.length} events
        </span>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg text-primary mb-4"></span>
          <p className="text-gray-500">Loading events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-gray-600 text-lg font-medium mb-2">No events yet</p>
          <p className="text-gray-500">Create one from the admin panel to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="card bg-white shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-indigo-200 group hover:-translate-y-1"
              onClick={() => setSelectedEvent(event)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="card-body">
                {/* Gradient accent bar with animation */}
                <div className="h-1.5 w-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-full -mt-2 mb-4 group-hover:h-2 transition-all duration-300" />

                <h3 className="card-title text-gray-800 text-xl group-hover:text-indigo-600 transition-colors">{event.name}</h3>
                <p className="text-gray-500 text-sm line-clamp-2 mb-3">{event.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-indigo-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate">{event.location}</span>
                  </div>

                  {/* Event date */}
                  {event.date_start && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 text-purple-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <span>
                        {new Date(event.date_start).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Feature badges */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {event.latitude && event.longitude && (
                    <span className="badge badge-sm bg-violet-100 text-violet-700 border-0">📍 Geo-fenced</span>
                  )}
                  <span className="badge badge-sm bg-fuchsia-100 text-fuchsia-700 border-0">🤖 AI Verified</span>
                  {event.venue_photos_count && event.venue_photos_count > 0 && (
                    <span className="badge badge-sm bg-blue-100 text-blue-700 border-0">📸 Venue Match</span>
                  )}
                </div>

                <div className="divider my-2"></div>

                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500">Availability</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min((event.minted / event.total_badges) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-700">
                        {event.minted}/{event.total_badges}
                      </span>
                    </div>
                  </div>
                  <button
                    className="btn btn-sm bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white border-0 shadow-md hover:shadow-lg transition-all"
                    disabled={!activeAddress}
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedEvent(event)
                    }}
                  >
                    {activeAddress ? '✨ Verify' : '🔒 Connect'}
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
