import { useState, useEffect, FormEvent } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { getFilterLabel } from '@/lib/filters'
import styles from '@/styles/Camera.module.css'

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
          <title>Room Not Found — POV Guest</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <div className={styles.container}>
          <div className={styles.card}>
            <span className={styles.logoText}>POV Guest</span>
            <p className={styles.apiError}>{error || 'Room not found'}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Head>
        <title>Join {room.name} — POV Guest</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.logoText}>POV Guest</div>
          <h1 className={styles.title}>{room.name}</h1>
          <p className={styles.subtitle}>
            Filter: {getFilterLabel(room.presetFilter)}
          </p>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="guestName">Display Name</label>
              <input
                className={styles.input}
                id="guestName"
                type="text"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Enter your name"
                autoComplete="name"
              />
              {nameError && <span className={styles.errorText}>{nameError}</span>}
            </div>

            <button className={styles.button} type="submit">
              Enter Room
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
