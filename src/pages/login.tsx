import { useState, FormEvent } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { Button } from '@astryxdesign/core/Button'
import { TextInput } from '@astryxdesign/core/TextInput'
import { Card } from '@astryxdesign/core/Card'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Banner } from '@astryxdesign/core/Banner'

interface FormErrors {
  email?: string
  password?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!email || !isValidEmail(email)) {
      newErrors.email = 'A valid email is required'
    }
    if (!password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setApiError('')

    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      router.push('/dashboard')
    } catch {
      setApiError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Sign In — POV Guest</title>
        <meta name="description" content="Sign in to your host account" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Warm event background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.35)',
          zIndex: 0,
        }} />

        <Card style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 420 }}>
          <form onSubmit={handleSubmit} noValidate>
            <VStack gap={4}>
              <VStack gap={1} align="center">
                <Heading level={1}>POV Guest</Heading>
                <Heading level={3}>Welcome back</Heading>
                <Text color="secondary">Sign in to manage your event rooms</Text>
              </VStack>

              <VStack gap={3}>
                <TextInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(val) => setEmail(val)}
                  placeholder="jane@example.com"
                  status={errors.email ? { type: 'error', message: errors.email } : undefined}
                />

                <TextInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(val) => setPassword(val)}
                  placeholder="Enter your password"
                  status={errors.password ? { type: 'error', message: errors.password } : undefined}
                />
              </VStack>

              {apiError && (
                <Banner status="error" title={apiError} />
              )}

              <Button
                label={loading ? 'Signing in…' : 'Sign In'}
                variant="primary"
                type="submit"
                isLoading={loading}
                width="100%"
              />

              <Text size="sm" color="secondary" justify="center">
                Don&apos;t have an account?{' '}
                <Link href="/register">Sign up</Link>
              </Text>
            </VStack>
          </form>
        </Card>
      </div>
    </>
  )
}
