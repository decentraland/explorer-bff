import { upgradeWebSocketResponse } from "@well-known-components/http-server/dist/ws"
import { IHttpServerComponent } from "@well-known-components/interfaces"
import { WebSocket } from "ws"
import { GlobalContext } from "../../types"
import * as proto from "../proto/broker"
import { Category, DataHeader, PositionData, ProfileData } from "../proto/comms"
import { Subscription } from "nats"

const HEARTBEAT_REFRESH_RATE = 100 // ms
const connections = new Set<WebSocket>()
const subscriptionsPerConnection = new WeakMap<WebSocket, Set<Subscription>>()

const connectionHeartbeats = new WeakMap<WebSocket, number>()

let connectionCounter = 0

const aliasToUserId = new Map<number, string>()
type Position3D = [number, number, number]

function getSubscriptionsList(socket: WebSocket): Set<Subscription> {
  let set = subscriptionsPerConnection.get(socket)
  if (!set) {
    set = new Set()
    subscriptionsPerConnection.set(socket, set)
  }
  return set
}

export async function websocketHandler(context: IHttpServerComponent.DefaultContext<GlobalContext>) {
  const messageBroker = context.components.messageBroker
  const logger = context.components.logs.getLogger("Websocket Handler")
  logger.info("Websocket")

  return upgradeWebSocketResponse((socket) => {
    logger.info("Websocket connected")
    // TODO fix ws types
    const ws = socket as any as WebSocket

    connections.add(ws)

    const alias = ++connectionCounter

    const query = context.url.searchParams
    const userId = query.get("identity") as string
    aliasToUserId.set(alias, userId)

    connections.add(ws)

    const subscription = messageBroker.subscribe("island", (topicData: any) => {
      ws.send(topicData)
    })
    const subscriptionList = getSubscriptionsList(ws)
    subscriptionList.add(subscription)

    ws.on("message", (message) => {
      const data = message as Buffer
      const msgType = proto.CoordinatorMessage.deserializeBinary(data).getType()

      if (msgType === proto.MessageType.PING) {
        ws.send(data)
      } else if (msgType === proto.MessageType.TOPIC) {
        const topicMessage = proto.TopicMessage.deserializeBinary(data)

        const topic = topicMessage.getTopic()

        // Heartbeat
        const body = topicMessage.getBody() as any
        const dataHeader = DataHeader.deserializeBinary(body)
        const category = dataHeader.getCategory()
        if (category === Category.POSITION) {
          const positionData = PositionData.deserializeBinary(body)
          const lastHearbeat = connectionHeartbeats.get(ws)
          const now = Date.now()
          if (!lastHearbeat || lastHearbeat < now - HEARTBEAT_REFRESH_RATE) {
            connectionHeartbeats.set(ws, now)
            const position = positionData.toObject()
            const peerPositionChange = {
              id: aliasToUserId.get(alias),
              position: [position.positionX, position.positionY, position.positionZ],
            }
            messageBroker.publish("heartbeat", peerPositionChange)
          }
        }

        const topicFwMessage = new proto.TopicFWMessage()
        topicFwMessage.setType(proto.MessageType.TOPIC_FW)
        topicFwMessage.setFromAlias(alias)
        topicFwMessage.setBody(topicMessage.getBody_asU8())

        const topicData = topicFwMessage.serializeBinary()

        messageBroker.publish("island", topicData)
      } else if (msgType === proto.MessageType.TOPIC_IDENTITY) {
        const topicMessage = proto.TopicIdentityMessage.deserializeBinary(data)

        const topic = topicMessage.getTopic()

        const topicFwMessage = new proto.TopicIdentityFWMessage()
        topicFwMessage.setType(proto.MessageType.TOPIC_IDENTITY_FW)
        topicFwMessage.setFromAlias(alias)
        topicFwMessage.setIdentity(aliasToUserId.get(alias)!)
        topicFwMessage.setRole(proto.Role.CLIENT)
        topicFwMessage.setBody(topicMessage.getBody_asU8())

        const topicData = topicFwMessage.serializeBinary()

        messageBroker.publish("island", topicData)
      }
    })

    setTimeout(() => {
      const welcome = new proto.WelcomeMessage()
      welcome.setType(proto.MessageType.WELCOME)
      welcome.setAlias(alias)
      const data = welcome.serializeBinary()

      ws.send(data)
    }, 100)

    ws.on("error", (error) => {
      logger.error(error)

      const subscriptionList = getSubscriptionsList(ws)
      subscriptionList.forEach((subscription: Subscription) => subscription.unsubscribe())

      ws.close()
      connections.delete(ws)
    })

    ws.on("close", () => {
      logger.info("Unsubscribed from topics")
      const subscriptionList = getSubscriptionsList(ws)
      subscriptionList.forEach((subscription: Subscription) => subscription.unsubscribe())

      logger.info("Websocket closed")
      connections.delete(ws)
    })
  })
}
