import { useState, useEffect, FormEvent } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Button } from '@astryxdesign/core/Button'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Card } from '@astryxdesign/core/Card'
import { VStack } from '@astryxdesign/core/VStack'
import { HStack } from '@astryxdesign/core/HStack'
import { Grid } from '@astryxdesign/core/Grid'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Banner } from '@astryxdesign/core/Banner'
import { Badge } from '@astryxdesign/core/Badge'

interface Room {
  id: string
  name: string
  code: string
  presetFilter: string
  createdAt: string
}

const FILTER_PRESETS = [
  { value: 'retro', label: 'Retro' },
  { value: 'classic-mono', label: 'Classic Mono' },
  { value: 'warm-film', label: 'Warm Film' },
  { value: 'cyan-drift', label: 'Cyan Drift' },
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
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '1.5rem' }}>
        <VStack gap={6}>
          <HStack justify="between" align="center">
            <Heading level={1}>POV Guest</Heading>
            <Button label="Sign Out" variant="ghost" onClick={handleLogout} />
          </HStack>

          <Card>
            <form onSubmit={handleCreate} noValidate>
              <VStack gap={3}>
                <Heading level={2}>Create a Room</Heading>

                <TextInput
                  label="Room Name"
                  type="text"
                  value={roomName}
                  onChange={(val) => setRoomName(val)}
                  placeholder="e.g. John & Jane's Wedding"
                  status={nameError ? { type: 'error', message: nameError } : undefined}
                />

                <VStack gap={1}>
                  <Text weight="medium">Filter Preset</Text>
                  <HStack gap={2} wrap="wrap">
                    {FILTER_PRESETS.map((preset) => (
                      <Button
                        key={preset.value}
                        label={preset.label}
                        variant={selectedFilter === preset.value ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => setSelectedFilter(preset.value)}
                      />
                    ))}
                  </HStack>
                </VStack>

                {createError && (
                  <Banner status="error" title={createError} />
                )}

                <Button
                  label={creating ? 'Creating…' : 'Create Room'}
                  variant="primary"
                  type="submit"
                  isLoading={creating}
                />
              </VStack>
            </form>
          </Card>

          <VStack gap={3}>
            <Heading level={2}>Your Rooms</Heading>

            {loading && <Text color="secondary">Loading…</Text>}

            {fetchError && <Banner status="error" title={fetchError} />}

            {!loading && !fetchError && rooms.length === 0 && (
              <Card>
                <VStack gap={1} align="center">
                  <Text weight="semibold">No rooms yet</Text>
                  <Text color="secondary">Create your first room above to get started.</Text>
                </VStack>
              </Card>
            )}

            {!loading && !fetchError && rooms.length > 0 && (
              <Grid columns={{ minWidth: 280 }} gap={3}>
                {rooms.map((room) => (
                  <Card key={room.id}>
                    <VStack gap={2}>
                      <HStack justify="between" align="center">
                        <Heading level={3}>{room.name}</Heading>
                        <Badge label={room.presetFilter} />
                      </HStack>
                      <Text color="secondary" size="sm">Code: {room.code}</Text>
                      <div style={{ textAlign: 'center' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getQrUrl(room.code)}
                          alt="QR Code"
                          style={{ width: 160, height: 160, borderRadius: 8 }}
                        />
                      </div>
                      <Text color="secondary" size="sm">Created {formatDate(room.createdAt)}</Text>
                    </VStack>
                  </Card>
                ))}
              </Grid>
            )}
          </VStack>
        </VStack>
      </div>
    </>
  )
}
