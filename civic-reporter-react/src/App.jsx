
import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'https://ai-civic-reporter-backend.onrender.com/api/complaints'
const PHOTO_URL = 'https://ai-civic-reporter-backend.onrender.com/api/photos'

function App() {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [deadlines, setDeadlines] = useState({})
  const [updatingId, setUpdatingId] = useState(null)

  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [locationLoading, setLocationLoading] = useState(false)
  const [coordinates, setCoordinates] = useState({
    latitude: '',
    longitude: ''
  })

  const [form, setForm] = useState({
    title: '',
    category: '',
    description: '',
    location: '',
    priority: 'MEDIUM'
  })

  async function loadComplaints() {
    try {
      setError('')
      const response = await fetch(API_URL)

      if (!response.ok) {
        throw new Error('Could not load complaints.')
      }

      setComplaints(await response.json())
    } catch {
      setError(
        'Unable to connect to the backend. Check that Spring Boot is running on port 8080.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComplaints()
  }, [])

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  function handleChange(event) {
    const { name, value } = event.target
    setForm(previous => ({ ...previous, [name]: value }))
  }

  function handlePhotoChange(event) {
    const selectedFile = event.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.type.startsWith('image/')) {
      setMessage('Please select an image file.')
      event.target.value = ''
      return
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setMessage('Please select an image smaller than 5 MB.')
      event.target.value = ''
      return
    }

    setPhoto(selectedFile)
    setPhotoPreview(URL.createObjectURL(selectedFile))
    setMessage('')
  }

  function removePhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhoto(null)
    setPhotoPreview('')

    const input = document.getElementById('photo')
    if (input) input.value = ''
  }

  function captureLocation() {
    setMessage('')

    if (!navigator.geolocation) {
      setMessage('Your browser does not support location services.')
      return
    }

    setLocationLoading(true)

    navigator.geolocation.getCurrentPosition(
      position => {
        setCoordinates({
          latitude: String(position.coords.latitude),
          longitude: String(position.coords.longitude)
        })
        setLocationLoading(false)
        setMessage('Live location captured successfully.')
      },
      err => {
        const reason =
          err.code === 1
            ? 'Location permission denied. Allow location access in your browser.'
            : err.code === 2
              ? 'Location unavailable. Try again in an open area.'
              : 'Location request timed out. Please try again.'

        setMessage(reason)
        setLocationLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      }
    )
  }

  async function uploadPhoto() {
    if (!photo) return null

    const data = new FormData()
    data.append('photo', photo)

    const response = await fetch(`${PHOTO_URL}/upload`, {
      method: 'POST',
      body: data
    })

    if (!response.ok) {
      throw new Error('Photo upload failed. Check PhotoUploadController.')
    }

    return (await response.text()).trim()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (
      !form.category ||
      !form.description.trim() ||
      !form.location.trim()
    ) {
      setMessage('Please fill in category, description, and location.')
      return
    }

    try {
      setSubmitting(true)

      // Upload the image first, then save its filename with the complaint.
      const photoUrl = await uploadPhoto()

      const complaint = {
        category: form.category,
        description: form.title.trim()
          ? `${form.title.trim()}: ${form.description.trim()}`
          : form.description.trim(),
        location: form.location.trim(),
        priority: form.priority,
        status: 'PENDING',
        escalated: false,
        latitude:
          coordinates.latitude === '' ? null : Number(coordinates.latitude),
        longitude:
          coordinates.longitude === '' ? null : Number(coordinates.longitude),
        photoUrl
      }

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaint)
      })

      if (!response.ok) {
        throw new Error('Complaint could not be saved.')
      }

      const savedComplaint = await response.json()

      setMessage(
        `Complaint submitted successfully! Complaint ID: ${savedComplaint.id}`
      )

      setForm({
        title: '',
        category: '',
        description: '',
        location: '',
        priority: 'MEDIUM'
      })

      removePhoto()
      setCoordinates({ latitude: '', longitude: '' })
      await loadComplaints()
    } catch (err) {
      setMessage(`Submission failed: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  async function setComplaintDeadline(id) {
    if (!deadlines[id]) {
      setMessage('Please select a deadline first.')
      return
    }

    try {
      setUpdatingId(id)
      setMessage('')

      const deadline = `${deadlines[id]}:00`
      const response = await fetch(
        `${API_URL}/${id}/deadline?deadline=${encodeURIComponent(deadline)}`,
        { method: 'PUT' }
      )

      if (!response.ok) throw new Error('Could not save the deadline.')

      setMessage(`Deadline saved for complaint #${id}.`)
      await loadComplaints()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  async function updateComplaintStatus(id, status) {
    try {
      setUpdatingId(id)
      setMessage('')

      const response = await fetch(
        `${API_URL}/${id}/status?status=${encodeURIComponent(status)}`,
        { method: 'PUT' }
      )

      if (!response.ok) throw new Error('Could not update complaint status.')

      setMessage(`Complaint #${id} updated to ${status}.`)
      await loadComplaints()
    } catch (err) {
      setMessage(err.message)
    } finally {
      setUpdatingId(null)
    }
  }

  function isOverdue(complaint) {
    return (
      complaint.status?.toUpperCase() !== 'RESOLVED' &&
      complaint.deadline &&
      new Date(complaint.deadline).getTime() < Date.now()
    )
  }

  const pendingCount = complaints.filter(
    c => c.status?.toUpperCase() === 'PENDING'
  ).length

  const resolvedCount = complaints.filter(
    c => c.status?.toUpperCase() === 'RESOLVED'
  ).length

  const overdueCount = complaints.filter(isOverdue).length

  return (
    <div className="app">
      <header className="header">
        <h1>AI Civic Reporter</h1>
        <p>Making our villages cleaner, safer, and better.</p>
      </header>

      <nav className="navbar">
        <a href="#home">Home</a>
        <a href="#report">Report an Issue</a>
        <a href="#dashboard">Dashboard</a>
        <a href="#track">Track Complaint</a>
      </nav>

      <main>
        <section id="home" className="hero">
          <h2>Report. Resolve. Improve.</h2>
          <p>Report village problems and track their progress.</p>
          <a className="primary-button" href="#report">
            Report a Problem
          </a>
        </section>

        <section id="report" className="section">
          <h2>Report a Civic Issue</h2>

          <form onSubmit={handleSubmit}>
            <label htmlFor="title">Issue Title</label>
            <input
              id="title"
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Example: Damaged road"
            />

            <label htmlFor="category">Category</label>
            <select
              id="category"
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">Select category</option>
              <option value="ROAD">Road Damage</option>
              <option value="GARBAGE">Garbage</option>
              <option value="DRAINAGE">Drainage</option>
              <option value="ELECTRICITY">Street Light / Electricity</option>
              <option value="WATER">Water Supply</option>
              <option value="OTHER">Other</option>
            </select>

            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Describe the problem..."
              rows="4"
              required
            />

            <label htmlFor="location">Address or nearby landmark</label>
            <input
              id="location"
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="Example: Near village school"
              required
            />

            <div className="location-tools">
              <button
                type="button"
                onClick={captureLocation}
                disabled={locationLoading}
              >
                {locationLoading
                  ? 'Getting Location...'
                  : '📍 Use My Live Location'}
              </button>

              {coordinates.latitude !== '' && (
                <div>
                  <p><strong>Latitude:</strong> {coordinates.latitude}</p>
                  <p><strong>Longitude:</strong> {coordinates.longitude}</p>
                  <a
                    href={`https://www.google.com/maps?q=${coordinates.latitude},${coordinates.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Check location on Google Maps
                  </a>
                </div>
              )}
            </div>

            <label htmlFor="photo">Upload Issue Photo</label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
            />
            <p>Choose an image up to 5 MB.</p>

            {photoPreview && (
              <div className="photo-preview">
                <p><strong>Photo preview</strong></p>
                <img
                  src={photoPreview}
                  alt="Selected civic issue"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '260px',
                    borderRadius: '10px'
                  }}
                />
                <button type="button" onClick={removePhoto}>
                  Remove Photo
                </button>
              </div>
            )}

            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </select>

            <button type="submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>

            {message && <p role="status">{message}</p>}
          </form>
        </section>

        <section id="dashboard" className="section">
          <h2>Complaint Dashboard</h2>

          <div className="stats">
            <div className="stat-card">
              <h3>{complaints.length}</h3>
              <p>Total Complaints</p>
            </div>
            <div className="stat-card">
              <h3>{pendingCount}</h3>
              <p>Pending</p>
            </div>
            <div className="stat-card">
              <h3>{resolvedCount}</h3>
              <p>Resolved</p>
            </div>
            <div className="stat-card">
              <h3>{overdueCount}</h3>
              <p>Overdue</p>
            </div>
          </div>

          {loading && <p>Loading complaints...</p>}
          {error && <p role="alert">{error}</p>}

          {!loading && !error && (
            <div className="complaint-list">
              <h3>Existing Complaints</h3>

              {complaints.length === 0 ? (
                <p>No complaints found.</p>
              ) : (
                complaints.map(complaint => (
                  <article className="complaint-card" key={complaint.id}>
                    <h4>
                      Complaint #{complaint.id} — {complaint.category}
                    </h4>

                    <p><strong>Description:</strong> {complaint.description}</p>
                    <p><strong>Location:</strong> {complaint.location || 'Not provided'}</p>
                    <p><strong>Priority:</strong> {complaint.priority || 'Not assigned'}</p>
                    <p><strong>Status:</strong> {complaint.status}</p>
                    <p>
                      <strong>Deadline:</strong>{' '}
                      {complaint.deadline
                        ? new Date(complaint.deadline).toLocaleString()
                        : 'Not set'}
                    </p>

                    {complaint.photoUrl && (
                      <div>
                        <p><strong>Issue Photo:</strong></p>
                        <a
                          href={`${PHOTO_URL}/${encodeURIComponent(complaint.photoUrl)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <img
                            src={`${PHOTO_URL}/${encodeURIComponent(complaint.photoUrl)}`}
                            alt={`Complaint ${complaint.id}`}
                            loading="lazy"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '240px',
                              borderRadius: '10px'
                            }}
                          />
                        </a>
                      </div>
                    )}

                    {complaint.latitude != null &&
                      complaint.longitude != null && (
                        <p>
                          <strong>GPS coordinates:</strong>{' '}
                          {complaint.latitude}, {complaint.longitude}
                          <br />
                          <a
                            href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open Location in Google Maps
                          </a>
                        </p>
                      )}

                    {isOverdue(complaint) && (
                      <p role="alert">
                        Overdue: this complaint needs attention.
                      </p>
                    )}

                    {complaint.escalated && (
                      <p>Escalation status: Escalated</p>
                    )}

                    {complaint.status?.toUpperCase() !== 'RESOLVED' && (
                      <>
                        <label htmlFor={`deadline-${complaint.id}`}>
                          Set resolution deadline
                        </label>

                        <input
                          id={`deadline-${complaint.id}`}
                          type="datetime-local"
                          value={deadlines[complaint.id] || ''}
                          onChange={event =>
                            setDeadlines(previous => ({
                              ...previous,
                              [complaint.id]: event.target.value
                            }))
                          }
                        />

                        <button
                          type="button"
                          disabled={updatingId === complaint.id}
                          onClick={() => setComplaintDeadline(complaint.id)}
                        >
                          {updatingId === complaint.id
                            ? 'Saving...'
                            : 'Save Deadline'}
                        </button>

                        <button
                          type="button"
                          disabled={updatingId === complaint.id}
                          onClick={() =>
                            updateComplaintStatus(complaint.id, 'RESOLVED')
                          }
                        >
                          Mark as Resolved
                        </button>
                      </>
                    )}

                    {complaint.status?.toUpperCase() === 'RESOLVED' && (
                      <p>This complaint has been resolved.</p>
                    )}
                  </article>
                ))
              )}

              <button type="button" onClick={loadComplaints}>
                Refresh Complaints
              </button>
            </div>
          )}
        </section>

        <section id="track" className="section">
          <h2>Track Your Complaint</h2>
          <p>Find your complaint in the dashboard using its complaint ID.</p>
        </section>
      </main>

      <footer>
        <p>AI Civic Reporter © 2026</p>
      </footer>
    </div>
  )
}

export default App
