import { Router } from '@well-known-components/http-server'
import { GlobalContext } from '../types'
import { pingHandler } from './handlers/ping-handler'
import { statusHandler } from './handlers/status-handler'
import { websocketHandler } from './handlers/ws-handler'
import { websocketRpcHandler } from './handlers/rpc-handler'
import { aboutHandler } from './handlers/about-handler'

// We return the entire router because it will be easier to test than a whole server
export async function setupRouter(_: GlobalContext): Promise<Router<GlobalContext>> {
  const router = new Router<GlobalContext>()

  router.get('/ping', pingHandler)

  router.get('/status', statusHandler)
  router.get('/ws', websocketHandler)
  router.get('/rpc', websocketRpcHandler)
  router.get('/about', aboutHandler)

  return router
}
