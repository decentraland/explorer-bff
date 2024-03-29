import { RpcServerHandler } from '@dcl/rpc'
import { registerService } from '@dcl/rpc/dist/codegen'
import { EthAddress } from '@dcl/schemas'
import { AuthChain, Authenticator } from '@dcl/crypto'
import { normalizeAddress } from '../../logic/address'
import { RpcContext, RpcSession, Channel } from '../../types'
import {
  BffAuthenticationServiceDefinition,
  DisconnectionMessage,
  DisconnectionReason
} from '@dcl/protocol/out-js/decentraland/bff/authentication_service.gen'
import {
  PeerTopicSubscriptionResultElem,
  SystemTopicSubscriptionResultElem,
  TopicsServiceDefinition
} from '@dcl/protocol/out-js/decentraland/bff/topics_service.gen'
import { commsModule, onPeerConnected, onPeerDisconnected, topicsModule } from './comms'
import { CommsServiceDefinition } from '@dcl/protocol/out-js/decentraland/bff/comms_service.gen'
import { future } from 'fp-future'

// TODO: use proper component-based loggers

/**
 * This function handles fresh RPC connections and initializes their authenticator.
 *
 * Upon successful authentication, the sessions (connections) are enabled the rest
 * of the available modules.
 */
export const rpcHandler: RpcServerHandler<RpcContext> = async (port, transport, context) => {
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
    async getDisconnectionMessage(_req, { peer }) {
      if (!peer) {
        throw new Error('no peer found')
      }

      const disconnectMessage = await peer.disconnectionFuture

      // NOTE: we set a timeout to close the transport in case the client is not properly handling this message
      setTimeout(() => {
        peer.transport.close()
      }, 10 * 1000)

      return disconnectMessage
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

        const peer: RpcSession = {
          address,
          port,
          transport,
          disconnectionFuture: future<DisconnectionMessage>(),
          subscriptionsIndex: 0,
          peerSubscriptions: new Map<number, Channel<PeerTopicSubscriptionResultElem>>(),
          systemSubscriptions: new Map<number, Channel<SystemTopicSubscriptionResultElem>>()
        }

        // hydrate the context with the session
        context.peer = peer

        const previousSession = context.components.rpcSessions.sessions.get(address)

        // disconnect previous session if it was already present
        if (previousSession) {
          previousSession.disconnectionFuture.resolve({
            reason: DisconnectionReason.DR_KICKED
          })
        }

        context.components.rpcSessions.sessions.set(address, peer)

        observeConnectedPeers(context)
        await onPeerConnected(context)
        // Remove the port from the rpcSessions if present.
        // TODO: write a test for this
        let portClosed = false
        port.on('close', async () => {
          if (portClosed) {
            return
          }
          portClosed = true
          if (context.components.rpcSessions.sessions.get(address)?.port === port) {
            context.components.rpcSessions.sessions.delete(address)
          }
          await onPeerDisconnected(context)
          observeConnectedPeers(context)
        })

        // register all the modules
        registerService(port, CommsServiceDefinition, async () => commsModule)
        registerService(port, TopicsServiceDefinition, async () => topicsModule)

        return {
          peerId: address,
          availableModules: [CommsServiceDefinition.name, TopicsServiceDefinition.name]
        }
      } else {
        setImmediate(() => port.close())
        logger.error(`Authentication failed`, { message: result.message } as any)
        throw new Error('Authentication failed')
      }
    }
  }))
}

function observeConnectedPeers(context: RpcContext) {
  const connected = context.components.rpcSessions.sessions.size
  context.components.metrics.observe('explorer_bff_connected_users', {}, connected)
}
