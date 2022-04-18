import { Router } from "@well-known-components/http-server"
import { GlobalContext } from "../types"
import { pingHandler } from "./handlers/ping-handler"
import { statusHandler } from "./handlers/status-handler"
import { websocketHandler } from "./handlers/ws-handler"
import { websocketBFFHandler } from "./handlers/ws-bff-handler"
import { websocketRoomHandler } from "./handlers/ws-room-handler"

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(globalContext: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.get("/ping", pingHandler)

  router.get("/status", statusHandler)
  router.get("/ws", websocketHandler)
  router.get("/ws-bff", websocketBFFHandler)
  router.get("/ws-rooms/:roomId", websocketRoomHandler)

  return router
}
