import { Router } from '@well-known-components/http-server'
import { GlobalContext } from '../types'
import { pingHandler } from './handlers/ping-handler'
import { clusterStatusHandler } from './handlers/cluster-status-handler'
import { statusHandler } from './handlers/status-handler'
import { websocketHandler } from './handlers/ws-handler'
import { websocketRoomHandler } from './handlers/ws-room-handler'
import { websocketRpcHandler } from './handlers/rpc-handler'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(_: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.get('/ping', pingHandler)

  router.get('/cluster-status', clusterStatusHandler)
  router.get('/status', statusHandler)
  router.get('/ws', websocketHandler)
  router.get('/rpc', websocketRpcHandler)
  router.get('/ws-rooms/:roomId', websocketRoomHandler)

  return router
}
