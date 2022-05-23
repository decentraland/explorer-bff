// This file is the "test-environment" analogous for src/components.ts
// Here we define the test components to be used in the testing environment

import { createRunner, createLocalFetchCompoment } from '@well-known-components/test-helpers'

import { main } from '../src/service'
import { TestComponents } from '../src/types'
import { initComponents as originalInitComponents } from '../src/components'
import { createLocalMessageBrokerComponent } from './helpers/message-broker'
import { URL } from 'url'
import { WebSocket } from 'ws'

/**
 * Behaves like Jest "describe" function, used to describe a test for a
 * use case, it creates a whole new program and components to run an
 * isolated test.
 *
 * State is persistent within the steps of the test.
 */
export const test = createRunner<TestComponents>({
  main,
  initComponents
})

async function createTestWsComponent(
  components: Pick<TestComponents, 'config'>
): Promise<TestComponents['createLocalWebSocket']> {
  const protocolHostAndProtocol = `ws://${await components.config.requireString(
    'HTTP_SERVER_HOST'
  )}:${await components.config.requireNumber('HTTP_SERVER_PORT')}`

  return {
    createWs(relativeUrl: string) {
      const url = new URL(relativeUrl, protocolHostAndProtocol).toString()
      return new WebSocket(url)
    }
  }
}

async function initComponents(): Promise<TestComponents> {
  const components = await originalInitComponents()

  const { config, logs } = components

  return {
    ...components,
    localFetch: await createLocalFetchCompoment(config),
    messageBroker: await createLocalMessageBrokerComponent({ config, logs }),
    createLocalWebSocket: await createTestWsComponent({ config })
  }
}
