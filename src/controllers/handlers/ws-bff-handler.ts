import { httpProviderForNetwork } from "@dcl/catalyst-contracts"
import { AuthChain, Authenticator } from "dcl-crypto"
import { upgradeWebSocketResponse } from "@well-known-components/http-server/dist/ws"
import { IHttpServerComponent } from "@well-known-components/interfaces"
import { WebSocket } from "ws"
import { GlobalContext } from "../../types"
import {
  ValidationOKMessage,
  ValidationFailureMessage,
  TopicMessage,
  OpenMessage,
  ValidationMessage,
  SubscriptionMessage,
  MessageHeader,
  MessageType,
  MessageTypeMap,
} from "../proto/bff_pb"
import { Subscription } from "../../ports/message-broker"

const connections = new Set<Peer>()
const topicsPerConnection = new WeakMap<Peer, Set<string>>()

const DEFAULT_ETH_NETWORK = "ropsten"
const CURRENT_ETH_NETWORK = process.env.ETH_NETWORK ?? DEFAULT_ETH_NETWORK

const ethProvider = httpProviderForNetwork(CURRENT_ETH_NETWORK)

type Peer = {
  ws: WebSocket
  peerId: string | null
  islandChangesSubscription?: Subscription
}

type IdentifierPeer = Peer & {
  peerId: string
}

function getTopicList(peer: Peer): Set<string> {
  let set = topicsPerConnection.get(peer)
  if (!set) {
    set = new Set()
    topicsPerConnection.set(peer, set)
  }
  return set
}

function broadcastTopicMessage(topicMessage: TopicMessage, fromPeer?: IdentifierPeer) {
  if (fromPeer) {
    topicMessage.setPeerId(fromPeer.peerId)
  }

  const topicData = topicMessage.serializeBinary()

  const topic = topicMessage.getTopic()
  connections.forEach(($) => {
    if (!fromPeer || fromPeer !== $) {
      if (getTopicList($).has(topic)) {
        $.ws.send(topicData)
      }
    }
  })
}


export async function setupArchipelagoSubscriptions(context: GlobalContext) {
  const messageBroker = context.components.messageBroker
  const logger = context.components.logs.getLogger("Websocket BFF Handler")

  messageBroker.subscribe(`island.*.peer_left`, ({ data, topic }) => {
    const topicMessage = new TopicMessage()
    topicMessage.setType(MessageType.TOPIC)
    topicMessage.setTopic(topic.getFullTopic())
    topicMessage.setBody(data)
    broadcastTopicMessage(topicMessage)
    logger.info('Sending peer left message')
  })

  messageBroker.subscribe(`island.*.peer_join`, ({ data, topic }) => {
    const topicMessage = new TopicMessage()
    topicMessage.setType(MessageType.TOPIC)
    topicMessage.setTopic(topic.getFullTopic())
    topicMessage.setBody(data)
    broadcastTopicMessage(topicMessage)
    logger.info('Sending peer join message')
  })
}

export async function teardownArchipelagoSubscriptions(context: IHttpServerComponent.DefaultContext<GlobalContext>) {
  // subscription.unsubscribe()
}

export async function websocketBFFHandler(context: IHttpServerComponent.DefaultContext<GlobalContext>) {
  const messageBroker = context.components.messageBroker
  const logger = context.components.logs.getLogger("Websocket BFF Handler")
  logger.info("Websocket")

  return upgradeWebSocketResponse((socket) => {
    logger.info("Websocket connected")
    // TODO fix ws types

    const welcomeMessage = Math.random().toString(36).substring(2)
    const peer = {
      ws: socket as any as WebSocket,
      peerId: null,
    } as Peer

    connections.add(peer)

    const welcome = new OpenMessage()
    welcome.setType(MessageType.OPEN)
    welcome.setPayload(welcomeMessage)
    peer.ws.send(welcome.serializeBinary())

    const subscribeToIslandChanges = () => {
      peer.islandChangesSubscription = messageBroker.subscribe(`peer.${peer.peerId}.island_changed`, ({ data }) => {
        // TODO: maybe check if the peer is subscribed to the topic
        console.log("SENDING ISLAND CHANGED")
        const topicMessage = new TopicMessage()
        topicMessage.setType(MessageType.TOPIC)
        topicMessage.setTopic(`peer.${peer.peerId}.island_changed`)
        topicMessage.setBody(data)
        peer.ws.send(topicMessage.serializeBinary())
      })

      // peer.islandChangesSubscription = messageBroker.subscribe(`peer.${peer.peerId}.island_changed`, ({ data }) => {
    }

    peer.ws.on("message", (message) => {
      const data = message as Buffer
      let msgType = MessageType.UNKNOWN_MESSAGE_TYPE as MessageTypeMap[keyof MessageTypeMap]
      try {
        msgType = MessageHeader.deserializeBinary(data).getType()
      } catch (err) {
        logger.error("cannot deserialize message header")
        return
      }

      switch (msgType) {
        case MessageType.UNKNOWN_MESSAGE_TYPE: {
          logger.log("unsupported message")
          break
        }
        case MessageType.VALIDATION: {
          const validationMessage = ValidationMessage.deserializeBinary(data)
          const payload = JSON.parse(validationMessage.getEncodedPayload()) as AuthChain
          Authenticator.validateSignature(welcomeMessage, payload, ethProvider).then((result) => {
            if (result.ok) {
              peer.peerId = payload[0].payload
              logger.log(`Successful validation for ${peer.peerId}`)
              const validationResultMessage = new ValidationOKMessage()
              validationResultMessage.setType(MessageType.VALIDATION_OK)
              validationResultMessage.setPeerId(peer.peerId)
              peer.ws.send(validationResultMessage.serializeBinary())
              subscribeToIslandChanges()
            } else {
              logger.log("Failed validation ${result.message}")
              const validationResultMessage = new ValidationFailureMessage()
              validationResultMessage.setType(MessageType.VALIDATION_FAILURE)
              peer.ws.send(validationResultMessage.serializeBinary())
            }
          })
          break
        }
        case MessageType.SUBSCRIPTION: {
          const subscriptionMessage = SubscriptionMessage.deserializeBinary(data)
          const topics = subscriptionMessage.getTopicsList()
          logger.info(`Subscription ${topics}`)

          const set = getTopicList(peer)
          set.clear()
          topics.forEach(($) => set.add($))
          break
        }
        case MessageType.TOPIC: {
          if (!peer.peerId) {
            break;
          }
          const heartbeatTopic = `peer.${peer.peerId}.heartbeat`
          const topicMessage = TopicMessage.deserializeBinary(data)
          if (topicMessage.getTopic() === heartbeatTopic) {
            messageBroker.publish(heartbeatTopic, topicMessage.getBody_asU8())
          } else {
            broadcastTopicMessage(topicMessage, peer as IdentifierPeer)
          }

          break
        }
        default: {
          logger.log(`ignoring msgType ${msgType}`)
          break
        }
      }
    })

    peer.ws.on("error", (error) => {
      logger.error(error)
      peer.ws.close()
      if (peer.peerId) {
        messageBroker.publish(`peer.${peer.peerId}.disconnect`)
      }
      peer.islandChangesSubscription?.unsubscribe()
      connections.delete(peer)
    })

    peer.ws.on("close", () => {
      logger.info("Websocket closed")
      if (peer.peerId) {
        messageBroker.publish(`peer.${peer.peerId}.disconnect`)
      }
      peer.islandChangesSubscription?.unsubscribe()
      connections.delete(peer)
    })
  })
}
