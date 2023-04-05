import { IBaseComponent, IConfigComponent } from '@well-known-components/interfaces'
import { BaseComponents } from '../types'

export type HealthStatus = {
  content: boolean
  lambdas: boolean
  comms: boolean
}

export type ServiceStatus = {
  time: number
  version?: string
  commitHash?: string
  publicUrl: string
}

export type IStatusComponent = IBaseComponent & {
  getLambdasHealth(): Promise<HealthStatus>
  getLambdasStatus(): Promise<ServiceStatus>
  getContentStatus(): Promise<ServiceStatus>
}

const STATUS_EXPIRATION_TIME_MS = 1000 * 60 * 5 // 5mins

export async function createStatusComponent(
  components: Pick<BaseComponents, 'fetch' | 'logs' | 'config'>
): Promise<IStatusComponent> {
  const { fetch, logs, config } = components

  const logger = logs.getLogger('status-component')
  const { lambdasUrl, contentUrl } = await loadServicesURLs(config)

  const fetchJson = async (baseURL: URL, path: string) => {
    let url = baseURL.toString()
    if (!url.endsWith('/')) {
      url += '/'
    }
    url += path
    const response = await fetch.fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })
    return response.json()
  }

  async function getLambdasHealth(): Promise<HealthStatus> {
    const health = {
      content: false,
      lambdas: false,
      comms: false
    }
    try {
      const data = await fetchJson(lambdasUrl.healthcheck, 'health')

      health.content = data['content'] === 'Healthy'
      health.lambdas = data['lambda'] === 'Healthy'
      health.comms = data['comms'] === 'Healthy'
    } catch (err: any) {
      logger.error(err)
    }

    return health
  }

  const lastLambdasStatus: ServiceStatus = {
    time: 0,
    publicUrl: lambdasUrl.public.toString()
  }

  async function getLambdasStatus() {
    if (Date.now() - lastLambdasStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastLambdasStatus
    }

    lastLambdasStatus.time = Date.now()
    try {
      const data = await fetchJson(lambdasUrl.healthcheck, 'status')
      lastLambdasStatus.version = data.catalystVersion
      lastLambdasStatus.commitHash = data.commitHash
    } catch (err: any) {
      logger.error(err)
    }

    return lastLambdasStatus
  }

  const lastContentStatus: ServiceStatus = {
    time: 0,
    publicUrl: contentUrl.public.toString()
  }
  async function getContentStatus() {
    if (Date.now() - lastContentStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastContentStatus
    }

    lastContentStatus.time = Date.now()
    try {
      const data = await fetchJson(contentUrl.healthcheck, 'status')
      lastContentStatus.version = data.catalystVersion
      lastContentStatus.commitHash = data.commitHash
    } catch (err: any) {
      logger.error(err)
    }

    return lastContentStatus
  }

  return {
    getLambdasHealth,
    getLambdasStatus,
    getContentStatus
  }
}

async function loadServicesURLs(config: IConfigComponent) {
  const publicLambdasUrl = new URL(await config.requireString('LAMBDAS_URL'))
  const healthCheckLambdasUrl = await config.getString('HEALTHCHECK_LAMBDAS_URL')
  const lambdasUrl = {
    public: publicLambdasUrl,
    healthcheck: healthCheckLambdasUrl ? new URL(healthCheckLambdasUrl) : publicLambdasUrl
  }
  const publicContentUrl = new URL(await config.requireString('CONTENT_URL'))
  const healthCheckContentUrl = await config.getString('HEALTHCHECK_CONTENT_URL')
  const contentUrl = {
    public: publicContentUrl,
    healthcheck: healthCheckContentUrl ? new URL(healthCheckContentUrl) : publicContentUrl
  }
  return { lambdasUrl, contentUrl }
}
