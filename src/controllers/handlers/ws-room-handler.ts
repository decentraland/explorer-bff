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

export async function websocketRoomHandler(context: IHttpServerComponent.PathAwareContext<GlobalContext>) {
  const logger = context.components.logs.getLogger("Websocket Room Handler")
  logger.info("Websocket")
  const roomId = context.params.roomId || "I1" // TODO: Validate params
  const connections = getConnectionsList(roomId)

  return upgradeWebSocketResponse((socket) => {
    logger.info("Websocket connected")
    // TODO fix ws types
    const ws = socket as any as WebSocket
    connections.add(ws)

    ws.on("message", (message) => {
      connections.forEach(($) => {
        if (ws !== $) {
          $.send(message)
        }
      })
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
