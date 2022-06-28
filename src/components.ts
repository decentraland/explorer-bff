import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createServerComponent, createStatusCheckComponent } from '@well-known-components/http-server'
import { createLogComponent } from '@well-known-components/logger'
import { createFetchComponent } from './ports/fetch'
import { createMetricsComponent } from '@well-known-components/metrics'
import { AppComponents, GlobalContext } from './types'
import { metricDeclarations } from './metrics'
import { createWsComponent } from './ports/ws'
import { createNatsComponent } from '@well-known-components/nats-component'
import { createRpcServer } from '@dcl/rpc'
import { httpProviderForNetwork } from '@dcl/catalyst-contracts'
import { createServiceDiscoveryComponent } from './ports/service-discovery'

const DEFAULT_ETH_NETWORK = 'ropsten'

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const config = await createDotEnvConfigComponent({ path: ['.env.default', '.env'] })

  const logs = createLogComponent()
  const ws = await createWsComponent({ logs })
  const server = await createServerComponent<GlobalContext>(
    { config, logs, ws: ws.ws },
    {
      cors: {
        maxAge: 36000
      }
    }
  )
  const rpcLogger = logs.getLogger('rpc-server')
  const rpcServer = createRpcServer<GlobalContext>({
    logger: rpcLogger
  })
  const statusChecks = await createStatusCheckComponent({ server, config })
  const fetch = await createFetchComponent()
  const metrics = await createMetricsComponent(metricDeclarations, { server, config })
  const nats = await createNatsComponent({ config, logs })
  const serviceDiscovery = await createServiceDiscoveryComponent({ nats, logs, config })

  // TODO: deprecate web3x and use ethersjs
  const CURRENT_ETH_NETWORK = (await config.getString('ETH_NETWORK')) ?? DEFAULT_ETH_NETWORK
  const ethereumProvider = httpProviderForNetwork(CURRENT_ETH_NETWORK)

  return {
    config,
    logs,
    server,
    statusChecks,
    fetch,
    metrics,
    ws,
    nats,
    serviceDiscovery,
    ethereumProvider,
    rpcServer,
    rpcSessions: {
      sessions: new Map()
    }
  }
}
