import { useState, useEffect, FormEvent } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import styles from '@/styles/Dashboard.module.css'

interface Room {
  id: string
  name: string
  code: string
  presetFilter: string
  createdAt: string
}

const FILTER_PRESETS = [
  { value: 'retro', label: 'Retro', swatchClass: 'swatchRetro' },
  { value: 'classic-mono', label: 'Classic Mono', swatchClass: 'swatchClassicMono' },
  { value: 'warm-film', label: 'Warm Film', swatchClass: 'swatchWarmFilm' },
  { value: 'cyan-drift', label: 'Cyan Drift', swatchClass: 'swatchCyanDrift' },
] as const

export default function DashboardPage() {
  const router = useRouter()
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  const [roomName, setRoomName] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('retro')
  const [creating, setCreating] = useState(false)
  const [nameError, setNameError] = useState('')
  const [createError, setCreateError] = useState('')

  async function fetchRooms() {
    try {
      const res = await fetch('/api/hosts/rooms', { credentials: 'include' })
      const data = await res.json()

      if (res.status === 401) {
        router.push('/login')
        return
      }
      if (!res.ok) {
        setFetchError('Failed to load rooms')
        setLoading(false)
        return
      }

      setFetchError('')
      setRooms(data.rooms || [])
      setLoading(false)
    } catch {
      setFetchError('Failed to load rooms')
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const res = await fetch('/api/hosts/rooms', { credentials: 'include' })
        const data = await res.json()

        if (!active) return

        if (res.status === 401) {
          router.push('/login')
          return
        }
        if (!res.ok) {
          setFetchError('Failed to load rooms')
          setLoading(false)
          return
        }

        setFetchError('')
        setRooms(data.rooms || [])
        setLoading(false)
      } catch {
        if (!active) return
        setFetchError('Failed to load rooms')
        setLoading(false)
      }
    }

    load()

    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setNameError('')
    setCreateError('')

    if (!roomName || roomName.trim().length === 0) {
      setNameError('Room name is required')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: roomName, presetFilter: selectedFilter }),
      })

      const data = await res.json()

      if (!res.ok) {
        setCreateError(data.error || 'Failed to create room')
        setCreating(false)
        return
      }

      setRoomName('')
      setSelectedFilter('retro')
      setCreating(false)
      fetchRooms()
    } catch {
      setCreateError('Something went wrong. Please try again.')
      setCreating(false)
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // proceed to redirect even on error
    }
    router.push('/login')
  }

  function getQrUrl(code: string): string {
    const joinUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${code}`
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(joinUrl)}`
  }

  function formatDate(iso: string): string {
    try {
      return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return ''
    }
  }

  return (
    <>
      <Head>
        <title>Dashboard — POV Guest</title>
        <meta name="description" content="Manage your event rooms" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.container}>
        <header className={styles.header}>
          <span className={styles.logoText}>POV Guest</span>
          <button className={styles.logoutButton} onClick={handleLogout}>
            Sign Out
          </button>
        </header>

        <main className={styles.main}>
          <section className={styles.createSection}>
            <h2 className={styles.createTitle}>Create a Room</h2>
            <form className={styles.form} onSubmit={handleCreate} noValidate>
              <input
                className={styles.input}
                id="room-name"
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. John & Jane's Wedding"
                aria-label="Room Name"
              />
              {nameError && <span className={styles.errorText}>{nameError}</span>}

              <div className={styles.filterGroup}>
                <span className={styles.filterLabel}>Filter Preset</span>
                <div className={styles.filterOptions}>
                  {FILTER_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      className={`${styles.filterButton} ${selectedFilter === preset.value ? styles.filterButtonActive : ''}`}
                      onClick={() => setSelectedFilter(preset.value)}
                    >
                      <span className={`${styles.filterSwatch} ${styles[preset.swatchClass]}`} />
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {createError && <div className={styles.apiError}>{createError}</div>}

              <button className={styles.createButton} type="submit" disabled={creating}>
                {creating ? 'Creating…' : 'Create Room'}
              </button>
            </form>
          </section>

          <h2 className={styles.sectionTitle}>Your Rooms</h2>

          {loading && <p className={styles.loading}>Loading…</p>}

          {fetchError && <p className={styles.loading}>{fetchError}</p>}

          {!loading && !fetchError && rooms.length === 0 && (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>No rooms yet</p>
              <p>Create your first room above to get started.</p>
            </div>
          )}

          {!loading && !fetchError && rooms.length > 0 && (
            <div className={styles.roomsGrid}>
              {rooms.map((room) => (
                <div key={room.id} className={styles.roomCard}>
                  <div className={styles.roomHeader}>
                    <h3 className={styles.roomName}>{room.name}</h3>
                    <span className={styles.filterBadge}>{room.presetFilter}</span>
                  </div>
                  <p className={styles.roomCode}>Code: {room.code}</p>
                  <div className={styles.qrContainer}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      className={styles.qrImage}
                      src={getQrUrl(room.code)}
                      alt="QR Code"
                    />
                  </div>
                  <p className={styles.roomDate}>Created {formatDate(room.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
