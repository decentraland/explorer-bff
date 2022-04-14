import { upgradeWebSocketResponse } from "@well-known-components/http-server/dist/ws"
import { IHttpServerComponent } from "@well-known-components/interfaces"
import { WebSocket } from "ws"
import { GlobalContext } from "../../types"
import * as proto from "../proto/broker"

const connectionsPerRoom = new Map<string, Set<WebSocket>>()
function getConnectionsList(roomId: string): Set<WebSocket> {
  let set = connectionsPerRoom.get(roomId)
  if (!set) {
    set = new Set()
    connectionsPerRoom.set(roomId, set)
  }
  return set
}

let connectionCounter = 0

const aliasToUserId = new Map<number, string>()

export async function websocketRoomHandler(
  context: IHttpServerComponent.DefaultContext<GlobalContext> & IHttpServerComponent.PathAwareContext<GlobalContext>
) {
  const logger = context.components.logs.getLogger("Websocket Room Handler")
  logger.info("Websocket")
  const roomId = context.params.roomId || "I1" // TODO: Validate params
  const connections = getConnectionsList(roomId)

  return upgradeWebSocketResponse((socket) => {
    logger.info("Websocket connected")
    // TODO fix ws types
    const ws = socket as any as WebSocket

    connections.add(ws)

    const alias = ++connectionCounter

    const query = context.url.searchParams
    const userId = query.get("identity") as string
    aliasToUserId.set(alias, userId)

    ws.on("message", (message) => {
      const data = message as Buffer
      const msgType = proto.CoordinatorMessage.deserializeBinary(data).getType()

      if (msgType === proto.MessageType.PING) {
        ws.send(data)
      } else if (msgType === proto.MessageType.TOPIC) {
        const topicMessage = proto.TopicMessage.deserializeBinary(data)

        const topicFwMessage = new proto.TopicFWMessage()
        topicFwMessage.setType(proto.MessageType.TOPIC_FW)
        topicFwMessage.setFromAlias(alias)
        topicFwMessage.setBody(topicMessage.getBody_asU8())

        const topicData = topicFwMessage.serializeBinary()

        // Reliable/unreliable data
        connections.forEach(($) => {
          if (ws !== $) {
            $.send(topicData)
          }
        })
      } else if (msgType === proto.MessageType.TOPIC_IDENTITY) {
        const topicMessage = proto.TopicIdentityMessage.deserializeBinary(data)

        const topicFwMessage = new proto.TopicIdentityFWMessage()
        topicFwMessage.setType(proto.MessageType.TOPIC_IDENTITY_FW)
        topicFwMessage.setFromAlias(alias)
        topicFwMessage.setIdentity(aliasToUserId.get(alias)!)
        topicFwMessage.setRole(proto.Role.CLIENT)
        topicFwMessage.setBody(topicMessage.getBody_asU8())

        const topicData = topicFwMessage.serializeBinary()

        // Reliable/unreliable data
        connections.forEach(($) => {
          if (ws !== $) {
            $.send(topicData)
          }
        })
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
      ws.close()
      connections.delete(ws)
    })

    ws.on("close", () => {
      logger.info("Websocket closed")
      connections.delete(ws)
    })
  })
}
