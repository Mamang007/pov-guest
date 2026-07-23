import { useState, useEffect, useRef } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { FILTER_PRESETS, getFilterCss, getFilterLabel } from '@/lib/filters'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Banner } from '@astryxdesign/core/Banner'
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import styles from '@/styles/Camera.module.css'

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

const CAMERA_FILTERS = FILTER_PRESETS.filter((f) => f.value !== 'none')
const POLL_INTERVAL = 5000

export default function RoomPage() {
  const router = useRouter()
  const { code, guest } = router.query

  const [room, setRoom] = useState<Room | null>(null)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [roomError, setRoomError] = useState('')

  // Camera state
  const [showCamera, setShowCamera] = useState(false)
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

  // Redirect if no guest name
  useEffect(() => {
    if (router.isReady && (!guest || typeof guest !== 'string' || guest.trim().length === 0)) {
      if (code && typeof code === 'string') {
        router.replace(`/join/${code}`)
      }
    }
  }, [router.isReady, guest, code, router])

  // Load room
  useEffect(() => {
    if (!code || typeof code !== 'string') return
    if (!guest || typeof guest !== 'string') return

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

    return () => { active = false }
  }, [code, guest])

  // Load & poll photos
  useEffect(() => {
    if (!room || !code || typeof code !== 'string') return

    let active = true

    async function loadPhotos() {
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
        // ignore
      }
    }

    loadPhotos()

    const interval = setInterval(loadPhotos, POLL_INTERVAL)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [room, code])

  // Camera lifecycle
  useEffect(() => {
    if (!showCamera || !room) return

    let active = true

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('Camera not available')
          return
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
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
        streamRef.current = null
      }
      setCameraReady(false)
      setCameraError('')
    }
  }, [showCamera, room])

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
      // Close camera and refresh gallery
      setTimeout(() => {
        setShowCamera(false)
        setUploadMessage('')
      }, 1200)
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

  function handleFileSelect(e: React.FormEvent<HTMLInputElement>) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file || !room || !guest || typeof guest !== 'string') return
    handleUpload(file, file.name)
  }

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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text color="secondary">Loading…</Text>
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
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <Card style={{ width: '100%', maxWidth: 420 }}>
            <VStack gap={2} align="center">
              <Heading level={1}>POV Guest</Heading>
              <Banner status="error" title={roomError || 'Room not found'} />
              <Link href="/">
                <Button label="← Back" variant="ghost" />
              </Link>
            </VStack>
          </Card>
        </div>
      </>
    )
  }

  // Camera view
  if (showCamera) {
    return (
      <>
        <Head>
          <title>Camera — {room.name} — POV Guest</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div style={{ minHeight: '100vh', padding: '1.5rem' }}>
          <div style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>
            <VStack gap={3}>
              <HStack justify="between" align="center">
                <Button label="← Back to Gallery" variant="ghost" onClick={() => setShowCamera(false)} />
                {guest && <Badge label={String(guest)} />}
              </HStack>

              <div className={styles.cameraContainer}>
                {cameraError ? (
                  <div className={styles.viewfinder}>
                    <div className={styles.fallbackContainer}>
                      <Text color="secondary">Camera not available. Upload a photo instead.</Text>
                      <Button
                        label="Choose File"
                        variant="primary"
                        onClick={() => fileInputRef.current?.click()}
                      />
                      <input
                        ref={fileInputRef}
                        style={{ display: 'none' }}
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

              {!cameraError && (
                <VStack gap={2}>
                  <HStack justify="between" align="center">
                    <Text type="supporting" weight="medium">
                      Filter: {filterEnabled ? getFilterLabel(currentFilter) : 'Off'}
                    </Text>
                    <Button
                      label={filterEnabled ? 'Filter On' : 'Filter Off'}
                      variant={filterEnabled ? 'primary' : 'secondary'}
                      size="sm"
                      onClick={toggleFilter}
                    />
                  </HStack>

                  <HStack gap={1} wrap="wrap">
                    {CAMERA_FILTERS.map((preset) => (
                      <Button
                        key={preset.value}
                        label={preset.label}
                        variant={filterEnabled && currentFilter === preset.value ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => switchFilter(preset.value)}
                      />
                    ))}
                  </HStack>

                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      className={styles.captureButton}
                      onClick={handleCapture}
                      disabled={capturing || !cameraReady}
                      aria-label="Capture"
                    >
                      <span className={styles.captureInner} />
                    </button>
                  </div>
                </VStack>
              )}

              {uploadMessage && <Banner status="success" title={uploadMessage} />}
              {uploadError && <Banner status="error" title={uploadError} />}
            </VStack>
          </div>
        </div>
      </>
    )
  }

  // Gallery view (default)
  return (
    <>
      <Head>
        <title>{room.name} — POV Guest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', padding: '1.5rem', paddingBottom: '5rem' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <VStack gap={4}>
            <HStack justify="between" align="center">
              <VStack gap={0.5}>
                <Heading level={2}>{room.name}</Heading>
                <Text color="secondary" size="sm">
                  {guest && `Hi, ${guest}!`} • Filter: {getFilterLabel(room.presetFilter)}
                </Text>
              </VStack>
              <Link href={`/join/${code}`}>
                <Button label="← Leave" variant="ghost" size="sm" />
              </Link>
            </HStack>

            {photos.length === 0 ? (
              <Card>
                <VStack gap={1} align="center">
                  <Text weight="semibold">No photos yet</Text>
                  <Text color="secondary">Be the first to capture a moment!</Text>
                </VStack>
              </Card>
            ) : (
              <Grid columns={{ minWidth: 200 }} gap={3}>
                {photos.map((photo) => (
                  <Card key={photo.id}>
                    <VStack gap={1}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.imageUrl}
                        alt={`Photo by ${photo.guestName}`}
                        style={{ width: '100%', borderRadius: 8, aspectRatio: '4/3', objectFit: 'cover' }}
                      />
                      <HStack justify="between" align="center">
                        <Text size="sm" weight="medium">{photo.guestName}</Text>
                        <Text size="sm" color="secondary">{formatTime(photo.createdAt)}</Text>
                      </HStack>
                    </VStack>
                  </Card>
                ))}
              </Grid>
            )}
          </VStack>
        </div>

        {/* Floating capture button */}
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}>
          <Button
            label="📷 Take a Photo"
            variant="primary"
            size="lg"
            onClick={() => setShowCamera(true)}
          />
        </div>
      </div>
    </>
  )
}
