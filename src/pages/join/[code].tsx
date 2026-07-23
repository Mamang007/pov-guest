import { useState, useEffect, FormEvent } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getFilterLabel } from '@/lib/filters'
import { Button } from '@astryxdesign/core/Button'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Card } from '@astryxdesign/core/Card'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Banner } from '@astryxdesign/core/Banner'
import { Center } from '@astryxdesign/core/Center'

interface Room {
  id: string
  name: string
  code: string
  presetFilter: string
  createdAt: string
}

export default function JoinPage() {
  const router = useRouter()
  const { code } = router.query

  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [guestName, setGuestName] = useState('')
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    if (!code || typeof code !== 'string') return

    let active = true

    async function loadRoom() {
      try {
        const res = await fetch(`/api/rooms/${code}`, { credentials: 'include' })
        const data = await res.json()

        if (!active) return

        if (!res.ok) {
          setError('Room not found')
          setLoading(false)
          return
        }

        setRoom(data)
        setLoading(false)
      } catch {
        if (!active) return
        setError('Room not found')
        setLoading(false)
      }
    }

    loadRoom()

    return () => {
      active = false
    }
  }, [code])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setNameError('')

    if (!guestName || guestName.trim().length === 0) {
      setNameError('Name is required')
      return
    }

    router.push({
      pathname: `/room/${code}`,
      query: { guest: guestName },
    })
  }

  if (loading) {
    return (
      <>
        <Head>
          <title>Join Room — POV Guest</title>
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
          <title>Room Not Found — POV Guest</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <Center style={{ minHeight: '100vh', padding: '1.5rem' }}>
          <Card style={{ width: '100%', maxWidth: 420 }}>
            <VStack gap={2} align="center">
              <Heading level={1}>POV Guest</Heading>
              <Banner status="error" title={error || 'Room not found'} />
            </VStack>
          </Card>
        </Center>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Join {room.name} — POV Guest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Center style={{ minHeight: '100vh', padding: '1.5rem' }}>
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <form onSubmit={handleSubmit} noValidate>
            <VStack gap={4}>
              <VStack gap={1} align="center">
                <Heading level={1}>POV Guest</Heading>
                <Heading level={2}>{room.name}</Heading>
                <Text color="secondary">Filter: {getFilterLabel(room.presetFilter)}</Text>
              </VStack>

              <TextInput
                label="Display Name"
                type="text"
                value={guestName}
                onChange={(val) => setGuestName(val)}
                placeholder="Enter your name"
                status={nameError ? { type: 'error', message: nameError } : undefined}
              />

              <Button
                label="Enter Room"
                variant="primary"
                type="submit"
                width="100%"
              />
            </VStack>
          </form>
        </Card>
      </Center>
    </>
  )
}
