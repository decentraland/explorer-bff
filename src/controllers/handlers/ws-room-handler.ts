import { upgradeWebSocketResponse } from "@well-known-components/http-server/dist/ws"
import { IHttpServerComponent } from "@well-known-components/interfaces"
import { WebSocket } from "ws"
import { GlobalContext } from "../../types"
import {
  MessageType,
  MessageHeader,
  MessageTypeMap,
  SystemMessage,
  IdentityMessage
} from "../proto/ws_pb"

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

      let msgType = MessageType.UNKNOWN_MESSAGE_TYPE as MessageTypeMap[keyof MessageTypeMap]
      try {
        msgType = MessageHeader.deserializeBinary(data).getType()
      } catch (err) {
        logger.error('cannot deserialize message header')
        return
      }

      switch (msgType) {
        case MessageType.UNKNOWN_MESSAGE_TYPE: {
          logger.log('unsupported message')
          break
        }
        case MessageType.SYSTEM: {
          try {
            const message = SystemMessage.deserializeBinary(data)
            message.setFromAlias(alias)

            // Reliable/unreliable data
            connections.forEach(($) => {
              if (ws !== $) {
                $.send(message.serializeBinary())
              }
            })
          } catch (e) {
            logger.error(`cannot process system message ${e}`)
          }
          break
        }
        case MessageType.IDENTITY: {
          try {
            const message = IdentityMessage.deserializeBinary(data)
            message.setFromAlias(alias)
            message.setIdentity(userId)

            // Reliable/unreliable data
            connections.forEach(($) => {
              if (ws !== $) {
                $.send(message.serializeBinary())
              }
            })
          } catch (e) {
            logger.error(`cannot process identity message ${e}`)
          }
          break
        }
        default: {
          logger.log(`ignoring msgType ${msgType}`)
          break
        }
      }


      ws.on("error", (error) => {
        logger.error(error)
        ws.close()
        const room = connectionsPerRoom.get(roomId)
        if (room) {
          room.delete(ws)
        }
      })

      ws.on("close", () => {
        logger.info("Websocket closed")
        const room = connectionsPerRoom.get(roomId)
        if (room) {
          room.delete(ws)
        }
      })
    })
  })
}