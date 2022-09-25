import { createRpcClient, RpcClient, RpcClientPort } from '@dcl/rpc'
import { loadService, RpcServerModule } from '@dcl/rpc/dist/codegen'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { BffAuthenticationServiceDefinition } from '../../src/protocol/bff/authentication-service'
import { createEphemeralIdentity } from '../helpers/identity'
import { TestComponents } from '../../src/types'
import { WebSocket } from 'ws'
import future from 'fp-future'
import { TsProtoServiceDefinition } from '@dcl/rpc/dist/codegen-types'

export function createAndAuthenticateIdentity(
  identityName: string,
  components: Pick<TestComponents, 'createLocalWebSocket'>
) {
  let client: RpcClient
  let port: RpcClientPort
  let ws: WebSocket
  const identity = createEphemeralIdentity(identityName)

  it('create and connect client: ' + identityName + ' (' + identity.address + ')', async () => {
    const { createLocalWebSocket } = components

    ws = createLocalWebSocket.createWs('/rpc')
    client = await createRpcClient(WebSocketTransport(ws))
    port = await client.createPort('my-port')
    port.on('close', () => ws.close())
    const auth = loadService(port, BffAuthenticationServiceDefinition)
    const challenge = await auth.getChallenge({ address: identity.address })
    await auth.authenticate({
      authChainJson: JSON.stringify(await identity.sign(challenge.challengeToSign))
    })
  })

  afterAll(() => {
    if (port) port.close()
    else ws?.close()
  })

  return {
    get client() {
      return client
    },
    get port() {
      return port
    },
    identity
  }
}

export async function getModuleFuture<Service extends TsProtoServiceDefinition>(
  rpc: ReturnType<typeof createAndAuthenticateIdentity>,
  moduleDefinition: Service
) {
  const fut = future<RpcServerModule<Service, void>>()

  it('load module ' + moduleDefinition.fullName + ' for ' + rpc.identity.address, async () => {
    fut.resolve(await loadService(rpc.port, moduleDefinition))
  })

  return fut
}

// async Array.from(generator*) with support for max elements
export async function takeAsync<T>(iter: AsyncGenerator<T>, max?: number) {
  let r: T[] = []
  let counter = 0
  for await (const $ of iter) {
    r.push($)
    counter++
    if (typeof max == 'number' && counter == max) break
  }
  return r
}
