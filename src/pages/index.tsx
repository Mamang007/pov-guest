import Head from 'next/head'
import Link from 'next/link'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { HStack } from '@astryxdesign/core/HStack'

export default function Home() {
  return (
    <>
      <Head>
        <title>POV Guest — Capture Every Moment, From Every Angle</title>
        <meta name="description" content="Let your guests capture the event from their point of view. Beautiful photos, one shared album." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background hero image */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.4)',
          zIndex: 0,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 560 }}>
          <VStack gap={5} align="center">
            <VStack gap={2} align="center">
              <Heading level={1} color="inherit">
                <span style={{ color: '#fff', fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  POV Guest
                </span>
              </Heading>
              <Text size="lg">
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>
                  Capture every moment, from every angle.
                </span>
              </Text>
              <Text>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Let your guests snap photos during weddings, trips, and parties — all collected in one beautiful live album.
                </span>
              </Text>
            </VStack>

            <HStack gap={2}>
              <Link href="/register">
                <Button label="Create Account" variant="primary" size="lg" />
              </Link>
              <Link href="/login">
                <Button label="Sign In" variant="secondary" size="lg" />
              </Link>
            </HStack>
          </VStack>
        </div>
      </div>
    </>
  )
}
