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
import { Center } from '@astryxdesign/core/Center'

interface FormErrors {
  name?: string
  email?: string
  password?: string
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!name || name.trim().length === 0) {
      newErrors.name = 'Name is required'
    }
    if (!email || !isValidEmail(email)) {
      newErrors.email = 'A valid email is required'
    }
    if (!password || password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters'
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
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setApiError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      router.push('/login')
    } catch {
      setApiError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <Head>
        <title>Sign Up — POV Guest</title>
        <meta name="description" content="Create your host account" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Center style={{ minHeight: '100vh', padding: '1.5rem' }}>
        <Card style={{ width: '100%', maxWidth: 420 }}>
          <form onSubmit={handleSubmit} noValidate>
            <VStack gap={4}>
              <VStack gap={1} align="center">
                <Heading level={1}>POV Guest</Heading>
                <Heading level={3}>Create your account</Heading>
                <Text color="secondary">Start capturing event memories</Text>
              </VStack>

              <VStack gap={3}>
                <TextInput
                  label="Name"
                  type="text"
                  value={name}
                  onChange={(val) => setName(val)}
                  placeholder="Jane Doe"
                  status={errors.name ? { type: 'error', message: errors.name } : undefined}
                />

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
                  placeholder="At least 6 characters"
                  status={errors.password ? { type: 'error', message: errors.password } : undefined}
                />
              </VStack>

              {apiError && (
                <Banner status="error" title={apiError} />
              )}

              <Button
                label={loading ? 'Creating account…' : 'Sign Up'}
                variant="primary"
                type="submit"
                isLoading={loading}
                width="100%"
              />

              <Text size="sm" color="secondary" justify="center">
                Already have an account?{' '}
                <Link href="/login">Sign in</Link>
              </Text>
            </VStack>
          </form>
        </Card>
      </Center>
    </>
  )
}
