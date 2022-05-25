import { RpcServerHandler, RpcServerPort } from '@dcl/rpc'
import { registerService } from '@dcl/rpc/dist/codegen'
import { EthAddress } from '@dcl/schemas'
import { AuthChain, Authenticator } from 'dcl-crypto'
import { normalizeAddress } from '../../logic/address'
import { RpcContext, RpcSession, Subscription } from '../../types'
import { BffAuthenticationServiceDefinition } from '../bff-proto/authentication-service'
import { commsModule, onPeerConnected, onPeerDisconnected } from './comms'
import { CommsServiceDefinition } from '../bff-proto/comms-service'
// import { roomsModule } from './rooms'

// TODO: use proper component-based loggers

/**
 * This function handles fresh RPC connections and initializes their authenticator.
 *
 * Upon successful authentication, the sessions (connections) are enabled the rest
 * of the available modules.
 */
export const rpcHandler: RpcServerHandler<RpcContext> = async (port, _transport, context) => {
  const challenge = 'dcl-' + Math.random().toString(36)

  const logger = context.components.logs.getLogger('rpc-auth-handler')

  registerService(port, BffAuthenticationServiceDefinition, async () => ({
    async getChallenge(req) {
      if (!EthAddress.validate(req.address)) {
        setImmediate(() => port.close())
        logger.warn(`Invalid address`, { address: req.address })
        throw new Error('Authentication failed')
      }

      const address = normalizeAddress(req.address)
      const alreadyConnected = context.components.rpcSessions.sessions.has(address)

      return {
        alreadyConnected,
        challengeToSign: challenge
      }
    },
    async authenticate(req) {
      const payload = JSON.parse(req.authChainJson) as AuthChain

      // TODO: properly normalize addresses (tolowercase is hackish)
      const address = normalizeAddress(payload[0].payload)

      // TODO: validate this address is the same as the one sent in the getChallenge
      if (!EthAddress.validate(address)) {
        setImmediate(() => port.close())
        logger.warn(`Invalid address`, { address: address })
        throw new Error('Authentication failed')
      }

      const result = await Authenticator.validateSignature(challenge, payload, context.components.ethereumProvider)

      if (result.ok) {
        logger.debug(`Authentication successful`, { address })

        await registerAuthenticatedConnectionModules(address, port, context)

        return {
          peerId: address
        }
      } else {
        setImmediate(() => port.close())
        logger.error(`Authentication failed`, { message: result.message } as any)
        throw new Error('Authentication failed')
      }
    }
  }))
}

async function registerAuthenticatedConnectionModules(
  _address: string,
  port: RpcServerPort<RpcContext>,
  context: RpcContext
) {
  const address = normalizeAddress(_address)

  const peer: RpcSession = {
    address,
    port,
    peerSubscriptions: new Map<number, Subscription>(),
    systemSubscriptions: new Map<number, Subscription>(),
    subscriptionsIndex: 0
  }

  // hydrate the context with the session
  context.peer = peer

  const previousSession = context.components.rpcSessions.sessions.get(address)

  // disconnect previous session if it was already present
  if (previousSession) {
    // TODO: prior to closing the port, we should send a notification
    previousSession.port.close()
  }

  context.components.rpcSessions.sessions.set(address, peer)

  await onPeerConnected(context)
  // Remove the port from the rpcSessions if present.
  // TODO: write a test for this
  port.on('close', async () => {
    if (context.components.rpcSessions.sessions.get(address)?.port === port) {
      context.components.rpcSessions.sessions.delete(address)
    }
    await onPeerDisconnected(context)
  })

  // register all the modules
  registerService(port, CommsServiceDefinition, async () => commsModule)
  // registerService(port, RoomServiceDefinition, async () => roomsModule)
}
