import { createRpcClient, RpcClient } from '@dcl/rpc'
import { loadService } from '@dcl/rpc/dist/codegen'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import {
  BffAuthenticationServiceDefinition,
  WelcomePeerInformation
} from '@dcl/protocol/out-js/decentraland/bff/authentication_service.gen'
import { test } from '../components'
import { RpcClientModule } from '@dcl/rpc/dist/codegen'
import { createEphemeralIdentity } from '../helpers/identity'
import { normalizeAddress } from '../../src/logic/address'

test('test RPC sanity check', function ({ components, stubComponents }) {
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
    authResponse = await auth.authenticate({
      authChainJson: JSON.stringify(await identity.sign(challenge.challengeToSign))
    })
    expect(authResponse.peerId).toEqual(normalizeAddress(identity.address))
  })
})
