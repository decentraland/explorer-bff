import { upgradeWebSocketResponse } from "@well-known-components/http-server/dist/ws"
import { IHttpServerComponent } from "@well-known-components/interfaces"
import { WebSocket } from "ws"
import { GlobalContext } from "../../types"
import { HeartBeatMessage, MessageHeader, MessageType, MessageTypeMap } from "../proto/bff_pb"
import { WorldPositionData } from "../proto/comms_pb"

const connections = new Set<WebSocket>()

let connectionCounter = 0

const aliasToUserId = new Map<number, string>()

export async function websocketBFFHandler(context: IHttpServerComponent.DefaultContext<GlobalContext>) {
  const messageBroker = context.components.messageBroker
  const logger = context.components.logs.getLogger("Websocket BFF Handler")
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

    ws.on("message", (message) => {
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
        case MessageType.HEARTBEAT: {
          try {
            const message = HeartBeatMessage.deserializeBinary(data)
            const worldPositionData = WorldPositionData.deserializeBinary(message.getData_asU8())
            const worldPosition = [
              worldPositionData.getPositionX(),
              worldPositionData.getPositionY(),
              worldPositionData.getPositionZ(),
            ]
            const peerPositionChange = {
              id: aliasToUserId.get(alias),
              position: worldPosition,
            }
            logger.info(`Heartbeat: ${JSON.stringify(peerPositionChange)}`)
            messageBroker.publish("heartbeat", peerPositionChange)
          } catch (e) {
            logger.error(`cannot process system message ${e}`)
          }
          break
        }
        default: {
          logger.log(`ignoring msgType ${msgType}`)
          break
        }
      }
    })

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
