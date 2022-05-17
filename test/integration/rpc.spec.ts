import { createRpcClient, RpcClient } from '@dcl/rpc'
import { loadService } from '@dcl/rpc/dist/codegen'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import {
  BffAuthenticationServiceDefinition,
  WelcomePeerInformation
} from '../../src/controllers/bff-proto/authentication-service'
import { test } from '../components'
import { createIdentity, sign } from 'eth-crypto'
import { Authenticator } from 'dcl-crypto'
import { RpcClientModule } from '@dcl/rpc/dist/codegen'
import * as crypto from 'crypto'

function toHex(bytes: Uint8Array): string {
  const hashArray = Array.from(bytes) // convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('') // convert bytes to hex string
  return hashHex
}

async function sha256(message: string): Promise<string> {
  const payload = new TextEncoder().encode(message) // encode as (utf-8) Uint8Array
  const hashBuffer = crypto.createHash('sha256').update(payload).digest() // hash the message
  return toHex(new Uint8Array(hashBuffer)) // convert buffer to byte array
}

async function createEphemeralIdentity() {
  const realIdentity = createIdentity()
  const ephemeral = createIdentity()
  console.log({ realIdentity, ephemeral })

  return {
    address: realIdentity.address,
    async sign(message: string) {
      const signature = Authenticator.createAuthChain(realIdentity, ephemeral, 10, message)
      console.log('sign', { message, signature })
      return signature
    }
  }
}

test('test RPC', function ({ components, stubComponents }) {
  let client: RpcClient
  let auth: RpcClientModule<BffAuthenticationServiceDefinition>
  let authResponse: WelcomePeerInformation

  it('connects WS', async () => {
    const identity = await createEphemeralIdentity()
    const { createLocalWebSocket } = components

    const ws = createLocalWebSocket.createWs('/rpc')
    client = await createRpcClient(WebSocketTransport(ws))
    const port = await client.createPort('my-port')
    auth = loadService(port, BffAuthenticationServiceDefinition)
    const challenge = await auth.getChallenge({ address: identity.address })
    console.log('challenge', challenge)
    authResponse = await auth.authenticate({
      authChainJson: JSON.stringify(await identity.sign(challenge.challengeToSign)),
      challengeToSign: challenge.challengeToSign
    })
    console.log('authResponse', authResponse)
  })
})
