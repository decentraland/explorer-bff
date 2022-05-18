import { Lifecycle } from '@well-known-components/interfaces'
import { setupRouter } from './controllers/routes'
import { AppComponents, GlobalContext, TestComponents } from './types'
import { setupArchipelagoSubscriptions } from './controllers/handlers/ws-bff-handler'
import { rpcHandler } from './controllers/bff-proto/initialize-rpc-server-handler'

// this function wires the business logic (adapters & controllers) with the components (ports)
export async function main(program: Lifecycle.EntryPointParameters<AppComponents | TestComponents>) {
  const { components, startComponents } = program
  const globalContext: GlobalContext = {
    components
  }

  // wire the HTTP router (make it automatic? TBD)
  const router = await setupRouter(globalContext)
  // register routes middleware
  components.server.use(router.middleware())
  // register not implemented/method not allowed/cors responses middleware
  components.server.use(router.allowedMethods())
  // set the context to be passed to the handlers
  components.server.setContext(globalContext)

  // attach the handler for new RPC connections
  components.rpcServer.setHandler(rpcHandler)

  // start ports: db, listeners, synchronizations, etc
  await startComponents()

  await setupArchipelagoSubscriptions(globalContext)
}
