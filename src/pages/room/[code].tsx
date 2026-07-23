import { useState, useEffect, useRef, FormEvent } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { FILTER_PRESETS, getFilterCss, getFilterLabel } from '@/lib/filters'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Banner } from '@astryxdesign/core/Banner'
import { Badge } from '@astryxdesign/core/Badge'
import { Center } from '@astryxdesign/core/Center'
import { Card } from '@astryxdesign/core/Card'
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
        <Center style={{ minHeight: '100vh', padding: '1.5rem' }}>
          <Text color="secondary">Loading…</Text>
        </Center>
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
        <Center style={{ minHeight: '100vh', padding: '1.5rem' }}>
          <Card style={{ width: '100%', maxWidth: 420 }}>
            <VStack gap={2} align="center">
              <Heading level={1}>POV Guest</Heading>
              <Banner status="error" title={roomError || 'Room not found'} />
            </VStack>
          </Card>
        </Center>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{room.name} — POV Guest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', padding: '1.5rem' }}>
        <div style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>
          <VStack gap={3}>
            <HStack justify="between" align="center">
              <Text weight="semibold">{room.name}</Text>
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

                <Center>
                  <button
                    className={styles.captureButton}
                    onClick={handleCapture}
                    disabled={capturing || !cameraReady}
                    aria-label="Capture"
                  >
                    <span className={styles.captureInner} />
                  </button>
                </Center>
              </VStack>
            )}

            {uploadMessage && (
              <Banner status="success" title={uploadMessage} />
            )}
            {uploadError && (
              <Banner status="error" title={uploadError} />
            )}
          </VStack>
        </div>
      </div>
    </>
  )
}
