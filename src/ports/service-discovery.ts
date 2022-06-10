import { IBaseComponent } from '@well-known-components/interfaces'
import { JSONCodec } from 'nats'
import { BaseComponents, Subscription } from '../types'

export type ServiceDiscoveryMessage = {
  serverName: string
  status: any
}

export type ClusterStatus = Map<string, any>
export type LastStatusUpdate = Map<string, number>

export type IServiceDiscoveryComponent = IBaseComponent & {
  getClusterStatus(): Promise<any>
  stop(): Promise<void>
}

export async function createServiceDiscoveryComponent(
  components: Pick<BaseComponents, 'messageBroker' | 'logs' | 'config'>
): Promise<IServiceDiscoveryComponent> {
  let healthCheckTimer: NodeJS.Timer
  let subscription: Subscription

  const { messageBroker, logs, config } = components
  const logger = logs.getLogger('Service Discovery')
  const jsonCodec = JSONCodec()

  const clusterStatus = new Map<string, any>()
  const lastStatusUpdate = new Map<string, number>()

  messageBroker.events.on('connected', async () => {
    await setupServiceDiscovery()
    await setupHealthCheck()
  })

  async function setupServiceDiscovery() {
    subscription = messageBroker.subscribe('service.discovery')
    ;(async () => {
      for await (const message of subscription.generator) {
        try {
          const discoveryMsg = jsonCodec.decode(message.data) as ServiceDiscoveryMessage
          clusterStatus.set(discoveryMsg.serverName, discoveryMsg.status)
          lastStatusUpdate.set(discoveryMsg.serverName, Date.now())
        } catch (err: any) {
          logger.error(`Could not decode status discovery message: ${err.message}`)
        }
      }
    })().catch((err: any) => logger.error(`error processing subscription message; ${err.toString()}`))
  }

  async function setupHealthCheck() {
    const interval = await config.requireNumber('SERVICE_DISCOVERY_HEALTH_CHECK_INTERVAL')
    healthCheckTimer = setInterval(() => {
      for (const [serverName, lastUpdate] of lastStatusUpdate) {
        const unhealthy = lastUpdate < Date.now() - interval
        if (unhealthy) {
          clusterStatus.delete(serverName)
          lastStatusUpdate.delete(serverName)
        }
      }
    }, interval)
  }

  async function getClusterStatus() {
    return Object.fromEntries(clusterStatus)
  }

  async function stop() {
    clearInterval(healthCheckTimer)
    subscription?.unsubscribe()
  }

  return {
    getClusterStatus,
    stop
  }
}
