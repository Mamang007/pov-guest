import Head from 'next/head'
import Link from 'next/link'
import { Button } from '@astryxdesign/core/Button'
import { VStack } from '@astryxdesign/core/VStack'
import { Heading } from '@astryxdesign/core/Heading'
import { Text } from '@astryxdesign/core/Text'
import { Center } from '@astryxdesign/core/Center'

export default function Home() {
  return (
    <>
      <Head>
        <title>POV Guest — Event Photos from Every Angle</title>
        <meta name="description" content="Capture event photos from your guests' point of view" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Center style={{ minHeight: '100vh', padding: '1.5rem' }}>
        <VStack gap={4} align="center">
          <VStack gap={1} align="center">
            <Heading level={1}>POV Guest</Heading>
            <Text color="secondary">Event photos from every angle</Text>
          </VStack>

          <VStack gap={2} align="center">
            <Link href="/login">
              <Button label="Host Sign In" variant="primary" />
            </Link>
            <Link href="/register">
              <Button label="Create Account" variant="secondary" />
            </Link>
          </VStack>
        </VStack>
      </Center>
    </>
  )
}
