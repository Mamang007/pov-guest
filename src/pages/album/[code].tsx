import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getFilterLabel } from '@/lib/filters'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Badge } from '@astryxdesign/core/Badge'
import { Card } from '@astryxdesign/core/Card'
import { Center } from '@astryxdesign/core/Center'
import { Banner } from '@astryxdesign/core/Banner'
import { Button } from '@astryxdesign/core/Button'
import { Dialog } from '@astryxdesign/core/Dialog'

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
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

  const handlePrev = useCallback(() => {
    if (selectedIndex === null || selectedIndex <= 0) return
    setSelectedIndex(selectedIndex - 1)
  }, [selectedIndex])

  const handleNext = useCallback(() => {
    if (selectedIndex === null || selectedIndex >= photos.length - 1) return
    setSelectedIndex(selectedIndex + 1)
  }, [selectedIndex, photos.length])

  useEffect(() => {
    if (selectedIndex === null) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') handlePrev()
      if (e.key === 'ArrowRight') handleNext()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedIndex, handlePrev, handleNext])

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    } catch {
      return ''
    }
  }

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null

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

  if (error || !room) {
    return (
      <>
        <Head>
          <title>Gallery — POV Guest</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <Center style={{ minHeight: '100vh', padding: '1.5rem' }}>
          <Banner status="error" title={error || 'Room not found'} />
        </Center>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>{room.name} Gallery — POV Guest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
        <VStack gap={4}>
          <HStack justify="between" align="center">
            <HStack gap={2} align="center">
              <Heading level={1}>POV Guest</Heading>
              <Text weight="medium">{room.name}</Text>
            </HStack>
            <Badge label="● Live" />
          </HStack>

          {photos.length === 0 ? (
            <Card>
              <VStack gap={1} align="center">
                <Text weight="semibold">No photos yet</Text>
                <Text color="secondary">Be the first to share a moment!</Text>
              </VStack>
            </Card>
          ) : (
            <Grid columns={{ minWidth: 240 }} gap={3}>
              {photos.map((photo, index) => (
                <Card key={photo.id}>
                  <VStack gap={2}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imageUrl}
                      alt={`Photo by ${photo.guestName}`}
                      style={{ width: '100%', borderRadius: 8, aspectRatio: '4/3', objectFit: 'cover', cursor: 'pointer' }}
                      onClick={() => setSelectedIndex(index)}
                    />
                    <VStack gap={0.5}>
                      <Text weight="medium">{photo.guestName}</Text>
                      <HStack justify="between" align="center">
                        <Badge label={getFilterLabel(photo.filterApplied)} />
                        <Text size="sm" color="secondary">{formatTime(photo.createdAt)}</Text>
                      </HStack>
                    </VStack>
                  </VStack>
                </Card>
              ))}
            </Grid>
          )}
        </VStack>
      </div>

      {/* Photo Preview Modal */}
      <Dialog
        isOpen={selectedPhoto !== null}
        onOpenChange={(open) => { if (!open) setSelectedIndex(null) }}
        width="90vw"
        maxHeight="90vh"
      >
        {selectedPhoto && (
          <VStack gap={3}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={selectedPhoto.imageUrl}
              alt={`Photo by ${selectedPhoto.guestName}`}
              style={{
                width: '100%',
                maxHeight: '65vh',
                objectFit: 'contain',
                borderRadius: 8,
              }}
            />
            <HStack justify="between" align="center">
              <VStack gap={0.5}>
                <Text weight="semibold">{selectedPhoto.guestName}</Text>
                <HStack gap={1} align="center">
                  <Badge label={getFilterLabel(selectedPhoto.filterApplied)} />
                  <Text size="sm" color="secondary">{formatTime(selectedPhoto.createdAt)}</Text>
                </HStack>
              </VStack>
              <HStack gap={1}>
                <Button
                  label="←"
                  variant="ghost"
                  size="sm"
                  onClick={handlePrev}
                  isDisabled={selectedIndex === 0}
                />
                <Text size="sm" color="secondary">
                  {(selectedIndex ?? 0) + 1} / {photos.length}
                </Text>
                <Button
                  label="→"
                  variant="ghost"
                  size="sm"
                  onClick={handleNext}
                  isDisabled={selectedIndex === photos.length - 1}
                />
              </HStack>
            </HStack>
          </VStack>
        )}
      </Dialog>
    </>
  )
}
