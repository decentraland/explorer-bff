import { httpProviderForNetwork } from "@dcl/catalyst-contracts"
import { AuthChain, Authenticator } from "dcl-crypto"
import { upgradeWebSocketResponse } from "@well-known-components/http-server/dist/ws"
import { IHttpServerComponent } from "@well-known-components/interfaces"
import { WebSocket } from "ws"
import { GlobalContext } from "../../types"
import {
  ValidationResultMessage,
  TopicMessage,
  OpenMessage,
  HeartBeatMessage,
  IslandChangesMessage,
  ValidationMessage,
  SubscriptionMessage,
  MessageHeader,
  MessageType,
  MessageTypeMap,
} from "../proto/bff_pb"
import { WorldPositionData } from "../proto/comms_pb"
import { HeartbeatMessage, IslandChangedMessage } from "../proto/nats_pb"
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

function getTopicList(peer: Peer): Set<string> {
  let set = topicsPerConnection.get(peer)
  if (!set) {
    set = new Set()
    topicsPerConnection.set(peer, set)
  }
  return set
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

    // Island Changes
    // TODO implement island leave message
    const subscribeToIslandChanges = () => {
      peer.islandChangesSubscription = messageBroker.subscribe(`peer.${peer.peerId}.island_changed`, ({ data }) => {
        try {
          const brokerMessage = IslandChangedMessage.deserializeBinary(data)
          const islandId = brokerMessage.getIslandId()
          const connStr = brokerMessage.getConnStr()
          logger.info(`Peer ${peer.peerId} moved to island ${islandId} using ${connStr}`)

          const wsMessage = new IslandChangesMessage()
          wsMessage.setType(MessageType.ISLAND_CHANGES)
          wsMessage.setConnStr(connStr)
          peer.ws.send(wsMessage.serializeBinary())
        } catch (e) {
          logger.error(`cannot process island_changes message ${e}`)
        }
      })
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
            const validationResultMessage = new ValidationResultMessage()
            if (result.ok) {
              peer.peerId = payload[0].payload
              logger.log(`Successful validation for ${peer.peerId}`)
              validationResultMessage.setType(MessageType.VALIDATION_OK)
              subscribeToIslandChanges()
            } else {
              logger.log("Failed validation ${result.message}")
              validationResultMessage.setType(MessageType.VALIDATION_FAILURE)
            }
            peer.ws.send(validationResultMessage.serializeBinary())
          })
          break
        }
        case MessageType.HEARTBEAT: {
          if (!peer.peerId) {
            break
          }

          try {
            const message = HeartBeatMessage.deserializeBinary(data)
            const worldPositionData = WorldPositionData.deserializeBinary(message.getData_asU8())
            const worldPosition = [
              worldPositionData.getPositionX(),
              worldPositionData.getPositionY(),
              worldPositionData.getPositionZ(),
            ]

            const heartbeatMessage = new HeartbeatMessage()
            heartbeatMessage.setPositionList(worldPosition)

            messageBroker.publish(`peer.${peer.peerId}.heartbeat`, heartbeatMessage.serializeBinary())
          } catch (e) {
            logger.error(`cannot process system message ${e}`)
          }
          break
        }
        case MessageType.SUBSCRIPTION: {
          const topicMessage = SubscriptionMessage.deserializeBinary(data)
          const rawTopics = topicMessage.getTopics()
          const topics = Buffer.from(rawTopics as string).toString("utf8")
          const set = getTopicList(peer)
          logger.info("Subscription", { topics })

          set.clear()
          topics.split(/\s+/g).forEach(($) => set.add($))
          break
        }
        case MessageType.TOPIC: {
          if (!peer.peerId) {
            break
          }
          const topicMessage = TopicMessage.deserializeBinary(data)
          topicMessage.setPeerId(peer.peerId)
          const topicData = topicMessage.serializeBinary()

          const topic = topicMessage.getTopic()
          connections.forEach(($) => {
            if (peer !== $) {
              if (getTopicList($).has(topic)) {
                $.ws.send(topicData)
              }
            }
          })
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
