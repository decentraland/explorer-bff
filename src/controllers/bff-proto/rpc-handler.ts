import { httpProviderForNetwork } from '@dcl/catalyst-contracts'
import { AuthChain, Authenticator } from 'dcl-crypto'
import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { GlobalContext } from '../../types'
import { createRpcServer, RpcServerPort } from '@dcl/rpc'
import { registerService } from '@dcl/rpc/dist/codegen'

import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { BffAuthenticationServiceDefinition } from './authentication-service'
import { CommsServiceDefinition } from './comms-service'

const connections = new Map<string, Peer>()

const DEFAULT_ETH_NETWORK = 'ropsten'
const CURRENT_ETH_NETWORK = process.env.ETH_NETWORK ?? DEFAULT_ETH_NETWORK

const ethProvider = httpProviderForNetwork(CURRENT_ETH_NETWORK)

type Peer = {
  port: RpcServerPort
  peerId: string
}

const server = createRpcServer({
  async initializePort(port) {
    const challenge = Math.random().toString(36)

    registerService(port, BffAuthenticationServiceDefinition, async () => ({
      async getChallenge(_req) {
        return {
          alreadyConnected: false,
          challengeToSign: challenge
        }
      },
      async authenticate(req) {
        console.log({ req })
        const payload = JSON.parse(req.authChainJson) as AuthChain
        const address = payload[0].payload
        const result = await Authenticator.validateSignature(challenge, payload, ethProvider)

        if (result.ok) {
          console.log(`Successful validation for ${address}`)

          registerAuthenticatedConnectionModules(address, port)

          // subscribeToIslandChanges()
          return {
            peerId: address
          }
        } else {
          setImmediate(() => port.close())
          console.log(`Failed validation ${result.message}`)
          throw new Error('Authentication failed')
        }
      }
    }))
  }
})

function registerAuthenticatedConnectionModules(address: string, port: RpcServerPort) {
  const peer: Peer = {
    peerId: address,
    port
  }
  connections.set(address, peer)

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

export async function websocketRpcHandler(_context: IHttpServerComponent.DefaultContext<GlobalContext>) {
  return upgradeWebSocketResponse((socket) => {
    const transport = WebSocketTransport(socket)
    server.attachTransport(transport)
  })
  // logger.info('Websocket connected')
  // // TODO fix ws types

  // const welcomeMessage = Math.random().toString(36).substring(2)
  // const peer = {
  //   ws: socket as any as WebSocket,
  //   peerId: null
  // } as Peer

  // connections.add(peer)

  // const welcome = new OpenMessage()
  // welcome.setType(MessageType.OPEN)
  // welcome.setPayload(welcomeMessage)
  // peer.ws.send(welcome.serializeBinary())

  // const subscribeToIslandChanges = () => {
  //   peer.islandChangesSubscription = messageBroker.subscribe(`peer.${peer.peerId}.island_changed`, ({ data }) => {
  //     const topicMessage = new TopicMessage()
  //     topicMessage.setType(MessageType.TOPIC)
  //     topicMessage.setTopic(`peer.${peer.peerId}.island_changed`)
  //     topicMessage.setBody(data)
  //     peer.ws.send(topicMessage.serializeBinary())
  //   })
  // }

  // peer.ws.on('message', async (message) => {
  //   const data = message as Buffer
  //   let msgType = MessageType.UNKNOWN_MESSAGE_TYPE as MessageTypeMap[keyof MessageTypeMap]
  //   try {
  //     msgType = MessageHeader.deserializeBinary(data).getType()
  //   } catch (err) {
  //     logger.error('cannot deserialize message header')
  //     return
  //   }

  //   switch (msgType) {
  //     case MessageType.UNKNOWN_MESSAGE_TYPE: {
  //       logger.log('unsupported message')
  //       break
  //     }
  //     case MessageType.VALIDATION: {
  //       const validationMessage = ValidationMessage.deserializeBinary(data)
  //       const payload = JSON.parse(validationMessage.getEncodedPayload()) as AuthChain
  //       const result = await Authenticator.validateSignature(welcomeMessage, payload, ethProvider)
  //       if (result.ok) {
  //         peer.peerId = payload[0].payload
  //         logger.log(`Successful validation for ${peer.peerId}`)
  //         const validationResultMessage = new ValidationOKMessage()
  //         validationResultMessage.setType(MessageType.VALIDATION_OK)
  //         validationResultMessage.setPeerId(peer.peerId)
  //         peer.ws.send(validationResultMessage.serializeBinary())
  //         subscribeToIslandChanges()
  //       } else {
  //         logger.log('Failed validation ${result.message}')
  //         const validationResultMessage = new ValidationFailureMessage()
  //         validationResultMessage.setType(MessageType.VALIDATION_FAILURE)
  //         peer.ws.send(validationResultMessage.serializeBinary())
  //       }
  //       break
  //     }
  //     case MessageType.SUBSCRIPTION: {
  //       const subscriptionMessage = SubscriptionMessage.deserializeBinary(data)
  //       const topics = subscriptionMessage.getTopicsList()
  //       logger.info(`Subscription ${topics}`)

  //       const set = getTopicList(peer)
  //       set.clear()
  //       topics.forEach(($) => set.add($))
  //       break
  //     }
  //     case MessageType.TOPIC: {
  //       if (!peer.peerId) {
  //         break
  //       }
  //       const heartbeatTopic = `peer.${peer.peerId}.heartbeat`
  //       const topicMessage = TopicMessage.deserializeBinary(data)
  //       if (topicMessage.getTopic() === heartbeatTopic) {
  //         messageBroker.publish(heartbeatTopic, topicMessage.getBody_asU8())
  //       } else {
  //         broadcastTopicMessage(topicMessage, peer as IdentifierPeer)
  //       }

  //       break
  //     }
  //     default: {
  //       logger.log(`ignoring msgType ${msgType}`)
  //       break
  //     }
  //   }
  // })

  // peer.ws.on('error', (error) => {
  //   logger.error(error)
  //   peer.ws.close()
  //   if (peer.peerId) {
  //     messageBroker.publish(`peer.${peer.peerId}.disconnect`)
  //   }
  //   peer.islandChangesSubscription?.unsubscribe()
  //   connections.delete(peer)
  // })

  // peer.ws.on('close', () => {
  //   logger.info('Websocket closed')
  //   if (peer.peerId) {
  //     messageBroker.publish(`peer.${peer.peerId}.disconnect`)
  //   }
  //   peer.islandChangesSubscription?.unsubscribe()
  //   connections.delete(peer)
  // })
  // })
}
