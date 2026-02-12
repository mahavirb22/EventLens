/**
 * CreateEvent.tsx — Admin panel to create new events.
 * Each event mints a new ASA on Algorand TestNet.
 * Now supports date/time ranges, GPS coordinates, venue photos, and certificate customization.
 */

import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { createEvent, EventData, getUserLocation } from '../utils/api'

interface Props {
  adminToken: string
  onCreated?: (event: EventData) => void
}

const CERTIFICATE_THEMES = [
  { value: 'modern', label: '🎨 Modern', primary: '#6366F1', secondary: '#4F46E5', desc: 'Indigo & Blue' },
  { value: 'classic', label: '🏆 Classic', primary: '#A16207', secondary: '#78350F', desc: 'Gold & Brown' },
  { value: 'elegant', label: '💜 Elegant', primary: '#7E22CE', secondary: '#581C87', desc: 'Purple' },
  { value: 'minimal', label: '⚪ Minimal', primary: '#0F172A', secondary: '#475569', desc: 'Black & White' },
  { value: 'gradient', label: '🌈 Gradient', primary: '#EC4899', secondary: '#DB2777', desc: 'Pink' },
  { value: 'corporate', label: '🏢 Corporate', primary: '#0EA5E9', secondary: '#0284C7', desc: 'Blue' },
]

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
  const [certificateTheme, setCertificateTheme] = useState('modern')
  const [customColors, setCustomColors] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('#6366F1')
  const [secondaryColor, setSecondaryColor] = useState('#4F46E5')
  const [textColor, setTextColor] = useState('#111827')
  const [borderColor, setBorderColor] = useState('#93C5FD')
  const [bgColor, setBgColor] = useState('#F5F7FA')
  const [venuePhotos, setVenuePhotos] = useState<string[]>([])
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

  const handleVenuePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    const readers: Promise<string>[] = []
    for (let i = 0; i < Math.min(files.length, 3); i++) {
      const file = files[i]
      if (file.size > 5 * 1024 * 1024) {
        setError('Each venue photo must be under 5MB')
        return
      }
      const reader = new FileReader()
      const promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
      readers.push(promise)
    }

    Promise.all(readers).then((photos) => {
      setVenuePhotos(photos)
      setError('')
    })
  }

  const removeVenuePhoto = (index: number) => {
    setVenuePhotos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleThemeChange = (theme: string) => {
    setCertificateTheme(theme)
    const selected = CERTIFICATE_THEMES.find((t) => t.value === theme)
    if (selected && !customColors) {
      setPrimaryColor(selected.primary)
      setSecondaryColor(selected.secondary)
    }
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
      const certificateColors = customColors
        ? {
            primary_color: primaryColor,
            secondary_color: secondaryColor,
            text_color: textColor,
            border_color: borderColor,
            bg_color: bgColor,
          }
        : null

      const event = await createEvent({
        name,
        description,
        location,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        date_start: dateStart ? new Date(dateStart).toISOString() : '',
        date_end: dateEnd ? new Date(dateEnd).toISOString() : '',
        total_badges: totalBadges,
        certificate_theme: certificateTheme,
        certificate_colors: certificateColors,
        venue_photos: venuePhotos,
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
      setCertificateTheme('modern')
      setCustomColors(false)
      setVenuePhotos([])
      onCreated?.(event)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create event')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
          Create New Event
        </h2>
        <p className="text-gray-600">Configure your event and customize certificates</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info Card */}
        <div className="card bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="card-body space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📋</span> Event Information
            </h3>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Event Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. VIT Blockchain Workshop"
                className="input input-bordered w-full focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
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
                className="textarea textarea-bordered w-full focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
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
                className="input input-bordered w-full focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Start Date/Time</span>
                </label>
                <input
                  type="datetime-local"
                  className="input input-bordered w-full focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
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
                  className="input input-bordered w-full focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Total Badges</span>
              </label>
              <input
                type="number"
                className="input input-bordered w-full focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                value={totalBadges}
                onChange={(e) => setTotalBadges(Number(e.target.value))}
                min={1}
                max={10000}
              />
            </div>
          </div>
        </div>

        {/* Location & Venue Photos Card */}
        <div className="card bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="card-body space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📍</span> Location & Venue Verification
            </h3>

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
                  className="input input-bordered col-span-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  className="input input-bordered col-span-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm h-full hover:bg-indigo-50 transition-all"
                  onClick={handleGetLocation}
                  disabled={geoLoading}
                  title="Use current GPS location"
                >
                  {geoLoading ? <span className="loading loading-spinner loading-xs"></span> : '📍'}
                </button>
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">
                  📸 Venue Reference Photos
                  <span className="text-xs text-gray-400 ml-2">(AI will compare student photos with these)</span>
                </span>
              </label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleVenuePhotoUpload}
                  className="file-input file-input-bordered w-full"
                />
                <p className="text-sm text-gray-500">
                  Upload 1-3 photos of the event venue. AI will verify students are at the correct location.
                </p>
                {venuePhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {venuePhotos.map((photo, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={photo}
                          alt={`Venue ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 group-hover:border-indigo-400 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => removeVenuePhoto(idx)}
                          className="absolute top-1 right-1 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Certificate Customization Card */}
        <div className="card bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow duration-300">
          <div className="card-body space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">🎨</span> Certificate Customization
            </h3>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Certificate Theme</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {CERTIFICATE_THEMES.map((theme) => (
                  <button
                    key={theme.value}
                    type="button"
                    onClick={() => handleThemeChange(theme.value)}
                    className={`p-4 rounded-lg border-2 transition-all text-left hover:scale-105 ${
                      certificateTheme === theme.value
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{
                          background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})`,
                        }}
                      />
                      <span className="font-semibold text-sm">{theme.label}</span>
                    </div>
                    <p className="text-xs text-gray-500">{theme.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={customColors}
                  onChange={(e) => setCustomColors(e.target.checked)}
                />
                <span className="label-text font-medium">🎨 Use Custom Colors</span>
              </label>
            </div>

            {customColors && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs">Primary</span>
                  </label>
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs">Secondary</span>
                  </label>
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs">Text</span>
                  </label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs">Border</span>
                  </label>
                  <input
                    type="color"
                    value={borderColor}
                    onChange={(e) => setBorderColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-xs">Background</span>
                  </label>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-full h-10 rounded cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* Certificate Preview */}
            <div className="p-6 rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-xs text-gray-500 mb-3 text-center">Certificate Preview</p>
              <div
                className="w-full h-32 rounded-lg shadow-lg flex items-center justify-center text-white font-bold text-xl transition-all"
                style={{
                  background: `linear-gradient(135deg, ${customColors ? primaryColor : CERTIFICATE_THEMES.find((t) => t.value === certificateTheme)?.primary}, ${customColors ? secondaryColor : CERTIFICATE_THEMES.find((t) => t.value === certificateTheme)?.secondary})`,
                }}
              >
                <div className="text-center">
                  <div className="text-2xl mb-1">🎓</div>
                  <div className="text-sm opacity-90">Certificate of Attendance</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Section */}
        <div className="card bg-white shadow-lg border border-gray-100">
          <div className="card-body space-y-4">
            {error && (
              <div className="alert alert-error shadow-lg animate-shake">
                <span>⚠️ {error}</span>
              </div>
            )}

            {success && (
              <div className="alert alert-success shadow-lg animate-bounce-in">
                <div>
                  <p className="font-medium">✅ Event created successfully!</p>
                  <p className="text-sm">
                    ID: {success.id} | ASA: {success.asset_id}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary w-full text-lg h-14 hover:scale-105 transition-transform shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-md"></span>
                  Creating on Algorand...
                </>
              ) : (
                <>
                  <span className="text-xl">🚀</span>
                  Create Event & Mint ASA
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CreateEvent
