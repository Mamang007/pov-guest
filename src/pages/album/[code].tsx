import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getFilterLabel } from '@/lib/filters'
import styles from '@/styles/Gallery.module.css'

interface Room {
  id: string
  name: string
  code: string
  presetFilter: string
  createdAt: string
}

interface Photo {
  id: string
  roomId: string
  guestName: string
  imageUrl: string
  filterApplied: string
  createdAt: string
}

const POLL_INTERVAL = 5000

export default function AlbumPage() {
  const router = useRouter()
  const { code } = router.query

  const [room, setRoom] = useState<Room | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    roomRef.current = room
  }, [room])

  useEffect(() => {
    if (!code || typeof code !== 'string') return

    let active = true

    async function load() {
      try {
        const roomRes = await fetch(`/api/rooms/${code}`, { credentials: 'include' })
        const roomData = await roomRes.json()

        if (!active) return

        if (!roomRes.ok) {
          setError('Room not found')
          setLoading(false)
          return
        }

        setRoom(roomData)
        roomRef.current = roomData

        const photosRes = await fetch(`/api/rooms/${code}/photos`, { credentials: 'include' })
        const photosData = await photosRes.json()

        if (!active) return

        if (!photosRes.ok) {
          setError('Failed to load photos')
          setLoading(false)
          return
        }

        const sorted = [...(photosData.photos || [])].sort(
          (a: Photo, b: Photo) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setPhotos(sorted)
        setLoading(false)
      } catch {
        if (!active) return
        setError('Failed to load')
        setLoading(false)
      }
    }

    load()

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rooms/${code}/photos`, { credentials: 'include' })
        const data = await res.json()

        if (!active) return

        if (res.ok) {
          const sorted = [...(data.photos || [])].sort(
            (a: Photo, b: Photo) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          setPhotos(sorted)
        }
      } catch {
        // silently ignore polling errors
      }
    }, POLL_INTERVAL)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [code])

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Loading… — POV Guest</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className={styles.container}>
          <div className={styles.loading}>Loading…</div>
        </div>
      </>
    )
  }

  if (error || !room) {
    return (
      <>
        <Head>
          <title>Gallery — POV Guest</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className={styles.container}>
          <div className={styles.errorState}>{error || 'Room not found'}</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{room.name} Gallery — POV Guest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.logoText}>POV Guest</span>
            <span className={styles.roomName}>{room.name}</span>
          </div>
          <div className={styles.liveBadge}>
            <span className={styles.liveDot} />
            Live
          </div>
        </header>

        <main className={styles.main}>
          {photos.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateTitle}>No photos yet</p>
              <p>Be the first to share a moment!</p>
            </div>
          ) : (
            <div className={styles.grid}>
              {photos.map((photo) => (
                <div key={photo.id} className={styles.photoCard}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className={styles.photoImage}
                    src={photo.imageUrl}
                    alt={`Photo by ${photo.guestName}`}
                  />
                  <div className={styles.photoInfo}>
                    <p className={styles.photoGuestName}>{photo.guestName}</p>
                    <div className={styles.photoMeta}>
                      <span className={styles.filterBadge}>
                        {getFilterLabel(photo.filterApplied)}
                      </span>
                      <span className={styles.photoTime}>{formatTime(photo.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
