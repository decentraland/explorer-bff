import { RpcServerHandler, RpcServerPort } from '@dcl/rpc'
import { registerService } from '@dcl/rpc/dist/codegen'
import { AuthChain, Authenticator } from 'dcl-crypto'
import { RpcContext, RpcSession } from '../../types'
import { BffAuthenticationServiceDefinition } from './authentication-service'
import { CommsServiceDefinition } from './comms-service'

// TODO: use proper component-based loggers

/**
 * This function handles fresh RPC connections and initializes their authenticator.
 *
 * Upon successful authentication, the sessions (connections) are enabled the rest
 * of the available modules.
 */
export const rpcHandler: RpcServerHandler<RpcContext> = async (port, _transport, context) => {
  const challenge = 'dcl-' + Math.random().toString(36)

  registerService(port, BffAuthenticationServiceDefinition, async () => ({
    async getChallenge(_req) {
      return {
        alreadyConnected: false, // TODO
        challengeToSign: challenge
      }
    },
    async authenticate(req) {
      console.log({ req })
      const payload = JSON.parse(req.authChainJson) as AuthChain

      // TODO: properly normalize addresses (tolowercase is hackish)
      const address = payload[0].payload.toLowerCase()

      const result = await Authenticator.validateSignature(challenge, payload, context.components.ethereumProvider)

      if (result.ok) {
        console.log(`Successful validation for ${address}`)

        registerAuthenticatedConnectionModules(address, port, context)

        return {
          peerId: address
        }
      } else {
        setImmediate(() => port.close())
        // TODO: proper logger
        console.log(`Failed validation ${result.message}`)
        throw new Error('Authentication failed')
      }
    }
  }))
}

function registerAuthenticatedConnectionModules(address: string, port: RpcServerPort<RpcContext>, context: RpcContext) {
  const peer: RpcSession = {
    address,
    port
  }
  // TODO: disconnect previous session if it was already present
  context.components.rpcSessions.sessions.set(address, peer)

  registerService(port, CommsServiceDefinition, async () => ({
    async publishToTopic(_topicMessage) {
      console.log('Publish to topic works')
      return {}
    },
    async *subscribeToTopic(_subscription) {
      console.log('Subscribe to topic works')
      return
    }
  }))
}
