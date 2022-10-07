import { IBaseComponent } from '@well-known-components/interfaces'
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

export type LighthouseStatus = ServiceStatus & {
  realmName?: string
  usersCount: number
}

export type IStatusComponent = IBaseComponent & {
  getLambdasHealth(): Promise<HealthStatus>
  getLambdasStatus(): Promise<ServiceStatus>
  getContentStatus(): Promise<ServiceStatus>
  getLighthouseStatus(): Promise<LighthouseStatus>
}

const STATUS_EXPIRATION_TIME_MS = 1000 * 60 * 5 // 5mins

export async function createStatusComponent(
  components: Pick<BaseComponents, 'fetch' | 'logs' | 'config'>
): Promise<IStatusComponent> {
  const { fetch, logs, config } = components

  const logger = logs.getLogger('status-component')
  const lambdasUrl = new URL(await config.requireString('LAMBDAS_URL'))
  const contentUrl = new URL(await config.requireString('CONTENT_URL'))
  const lighthouseUrl = new URL(await config.requireString('LIGHTHOUSE_URL'))

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
      const data = await fetchJson(lambdasUrl, 'health')

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
    publicUrl: lambdasUrl.toString()
  }

  async function getLambdasStatus() {
    if (Date.now() - lastLambdasStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastLambdasStatus
    }

    lastLambdasStatus.time = Date.now()
    try {
      const data = await fetchJson(lambdasUrl, 'status')
      lastLambdasStatus.version = data.catalystVersion
      lastLambdasStatus.commitHash = data.commitHash
    } catch (err: any) {
      logger.error(err)
    }

    return lastLambdasStatus
  }

  const lastContentStatus: ServiceStatus = {
    time: 0,
    publicUrl: contentUrl.toString()
  }
  async function getContentStatus() {
    if (Date.now() - lastContentStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastContentStatus
    }

    lastContentStatus.time = Date.now()
    try {
      const data = await fetchJson(contentUrl, 'status')
      lastContentStatus.version = data.catalystVersion
      lastContentStatus.commitHash = data.commitHash
    } catch (err: any) {
      logger.error(err)
    }

    return lastContentStatus
  }

  const lastLighthouseStatus: LighthouseStatus = {
    time: 0,
    usersCount: 0,
    publicUrl: lighthouseUrl.toString()
  }

  async function getLighthouseStatus() {
    if (Date.now() - lastLighthouseStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastLighthouseStatus
    }

    lastLighthouseStatus.time = Date.now()
    try {
      const data = await fetchJson(lighthouseUrl, 'status')

      lastLighthouseStatus.realmName = data.name
      lastLighthouseStatus.version = data.version
      lastLighthouseStatus.commitHash = data.env.commitHash
      lastLighthouseStatus.usersCount = data.usersCount
    } catch (e: any) {
      logger.warn(`Error fetching lighthouse status: ${e.toString()}`)
    }

    return lastLighthouseStatus
  }

  return {
    getLambdasHealth,
    getLambdasStatus,
    getContentStatus,
    getLighthouseStatus
  }
}
