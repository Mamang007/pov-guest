import { useState, useEffect, useRef, FormEvent } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { FILTER_PRESETS, getFilterCss, getFilterLabel } from '@/lib/filters'
import styles from '@/styles/Camera.module.css'

interface Room {
  id: string
  name: string
  code: string
  presetFilter: string
  createdAt: string
}

const CAMERA_FILTERS = FILTER_PRESETS.filter((f) => f.value !== 'none')

export default function RoomPage() {
  const router = useRouter()
  const { code, guest } = router.query

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [roomError, setRoomError] = useState('')
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [filterEnabled, setFilterEnabled] = useState(true)
  const [currentFilter, setCurrentFilter] = useState('retro')
  const [capturing, setCapturing] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadError, setUploadError] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!code || typeof code !== 'string') return

    let active = true

    async function loadRoom() {
      try {
        const res = await fetch(`/api/rooms/${code}`, { credentials: 'include' })
        const data = await res.json()

        if (!active) return

        if (!res.ok) {
          setRoomError('Room not found')
          setLoading(false)
          return
        }

        setRoom(data)
        setCurrentFilter(data.presetFilter || 'retro')
        setLoading(false)
      } catch {
        if (!active) return
        setRoomError('Room not found')
        setLoading(false)
      }
    }

    loadRoom()

    return () => {
      active = false
    }
  }, [code])

  useEffect(() => {
    if (!room) return

    let active = true

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera not available')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (!active) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setCameraReady(true)
      } catch {
        if (!active) return
        setCameraError('Camera not available')
      }
    }

    startCamera()

    return () => {
      active = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [room])

  const activeFilterCss = filterEnabled ? getFilterCss(currentFilter) : 'none'

  function toggleFilter() {
    setFilterEnabled((prev) => !prev)
  }

  function switchFilter(value: string) {
    setCurrentFilter(value)
    setFilterEnabled(true)
  }

  async function handleUpload(blob: Blob, filename: string) {
    if (!room || !guest || typeof guest !== 'string') return

    setCapturing(true)
    setUploadError('')
    setUploadMessage('')

    try {
      const formData = new FormData()
      formData.append('guestName', guest)
      formData.append('filterApplied', filterEnabled ? currentFilter : 'none')
      formData.append('roomId', room.id)
      formData.append('image', blob, filename)

      const res = await fetch('/api/photos/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        setUploadError(data.error || 'Upload failed. Try again.')
        setCapturing(false)
        return
      }

      setUploadMessage('Photo uploaded!')
      setCapturing(false)
    } catch {
      setUploadError('Upload failed. Try again.')
      setCapturing(false)
    }
  }

  function handleCapture() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const width = video.videoWidth || 720
    const height = video.videoHeight || 960
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.filter = filterEnabled ? getFilterCss(currentFilter) : 'none'
    ctx.drawImage(video, 0, 0, width, height)

    canvas.toBlob((blob) => {
      if (!blob) return
      handleUpload(blob, `capture-${Date.now()}.jpg`)
    }, 'image/jpeg')
  }

  function handleFileSelect(e: FormEvent<HTMLInputElement>) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !room || !guest || typeof guest !== 'string') return

    handleUpload(file, file.name)
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

  if (roomError || !room) {
    return (
      <>
        <Head>
          <title>Room Not Found — POV Guest</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className={styles.container}>
          <div className={styles.card}>
            <span className={styles.logoText}>POV Guest</span>
            <p className={styles.apiError}>{roomError || 'Room not found'}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{room.name} — POV Guest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.container}>
        <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto' }}>
          <div className={styles.header}>
            <span className={styles.roomName}>{room.name}</span>
            {guest && <span className={styles.guestBadge}>{guest}</span>}
          </div>

          <div className={styles.cameraContainer}>
            {cameraError ? (
              <div className={styles.viewfinder}>
                <div className={styles.fallbackContainer}>
                  <p className={styles.fallbackText}>Camera not available. Upload a photo instead.</p>
                  <button
                    className={styles.button}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose File
                  </button>
                  <input
                    ref={fileInputRef}
                    className={styles.hiddenInput}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
            ) : (
              <div className={styles.viewfinder}>
                <video
                  ref={videoRef}
                  className={styles.video}
                  style={{ filter: activeFilterCss }}
                  data-testid="camera-video"
                  playsInline
                  muted
                  autoPlay
                />
              </div>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </div>

          <div className={styles.controls}>
            {!cameraError && (
              <>
                <div className={styles.filterToggleRow}>
                  <span className={styles.filterLabel}>
                    Filter: {filterEnabled ? getFilterLabel(currentFilter) : 'Off'}
                  </span>
                  <button
                    className={`${styles.toggleButton} ${!filterEnabled ? styles.toggleButtonOff : ''}`}
                    onClick={toggleFilter}
                  >
                    {filterEnabled ? 'Filter On' : 'Filter Off'}
                  </button>
                </div>

                <div className={styles.filterOptions}>
                  {CAMERA_FILTERS.map((preset) => (
                    <button
                      key={preset.value}
                      className={`${styles.filterButton} ${filterEnabled && currentFilter === preset.value ? styles.filterButtonActive : ''}`}
                      onClick={() => switchFilter(preset.value)}
                    >
                      <span className={`${styles.filterSwatch} ${styles[`swatch${preset.label.replace(/\s/g, '')}`]}`} />
                      {preset.label}
                    </button>
                  ))}
                </div>

                <button
                  className={styles.captureButton}
                  onClick={handleCapture}
                  disabled={capturing || !cameraReady}
                  aria-label="Capture"
                >
                  <span className={styles.captureInner} />
                </button>
              </>
            )}
          </div>

          {uploadMessage && <div className={styles.successMessage}>{uploadMessage}</div>}
          {uploadError && <div className={styles.apiError}>{uploadError}</div>}
        </div>
      </div>
    </>
  )
}
