import { HTTPProvider } from 'eth-connect'
import { createDotEnvConfigComponent } from '@well-known-components/env-config-provider'
import { createServerComponent, createStatusCheckComponent } from '@well-known-components/http-server'
import { createLogComponent } from '@well-known-components/logger'
import { createFetchComponent } from './adapters/fetch'
import { createMetricsComponent, instrumentHttpServerWithMetrics } from '@well-known-components/metrics'
import { AppComponents, DEFAULT_ETH_NETWORK, GlobalContext } from './types'
import { metricDeclarations } from './metrics'
import { createWsComponent } from './adapters/ws'
import { createNatsComponent } from '@well-known-components/nats-component'
import { createLocalNatsComponent } from '@well-known-components/nats-component/dist/test-component'
import { createRpcServer } from '@dcl/rpc'
import { createServiceDiscoveryComponent } from './adapters/service-discovery'
import { createRealmComponent } from './adapters/realm'
import { catalystRegistryForProvider } from '@dcl/catalyst-contracts'
import { createStatusComponent } from './adapters/status'
import { observeBuildInfo } from './logic/build-info'
import { commsFixedAdapter, ICommsModeComponent } from './adapters/comms-fixed-adapter'
import { commsArchipelago } from './adapters/comms-archipelago'
import { commsLighthouse } from './adapters/comms-lighthouse'

// Initialize all the components of the app
export async function initComponents(): Promise<AppComponents> {
  const configs = ['.env.default', '.env']
  // appends a DOT_ENV file to test different configurations
  if (process.env.DOT_ENV) configs.push(process.env.DOT_ENV)
  const config = await createDotEnvConfigComponent({ path: configs })

  const ethNetwork = (await config.getString('ETH_NETWORK')) ?? DEFAULT_ETH_NETWORK
  const metrics = await createMetricsComponent(metricDeclarations, { config })
  const logs = await createLogComponent({ metrics })
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

  const hasNats = await config.getString('NATS_URL')

  const nats = hasNats ? await createNatsComponent({ config, logs }) : await createLocalNatsComponent()
  const serviceDiscovery = await createServiceDiscoveryComponent({ nats, logs, config })
  const ethereumProvider = new HTTPProvider(
    `https://rpc.decentraland.org/${encodeURIComponent(ethNetwork)}?project=explorer-bff`,
    { fetch: fetch.fetch }
  )

  const contract = await catalystRegistryForProvider(ethereumProvider)
  const realm = await createRealmComponent({ config, logs, fetch, contract })
  const status = await createStatusComponent({ config, logs, fetch })

  await instrumentHttpServerWithMetrics({ server, metrics, config })
  await observeBuildInfo({ config, metrics })

  let comms: ICommsModeComponent

  switch ((await config.getString('COMMS_MODE')) || 'archipelago') {
    case 'archipelago':
      comms = await commsArchipelago({ serviceDiscovery })
      break
    case 'fixed-adapter':
      comms = await commsFixedAdapter({ config })
      break
    case 'lighthouse':
      comms = await commsLighthouse({ status })
      break
    default:
      throw new Error('unknown COMMS_MODE')
  }

  return {
    comms,
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
    realm,
    contract,
    status,
    rpcSessions: {
      sessions: new Map()
    }
  }
}
