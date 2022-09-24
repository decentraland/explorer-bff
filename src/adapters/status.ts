import { IBaseComponent } from '@well-known-components/interfaces'
import { BaseComponents } from '../types'

export type HealthStatus = {
  content: boolean
  lambdas: boolean
  comms: boolean
}

export type ServiceStatus = {
  time: number
  version: string
  commitHash: string
  publicUrl: string
}

export type LighthouseStatus = ServiceStatus & {
  realmName: string
  usersCount: number
}

export type IStatusComponent = IBaseComponent & {
  getLambdasHealth(): Promise<HealthStatus | undefined>
  getLambdasStatus(): Promise<ServiceStatus | undefined>
  getContentStatus(): Promise<ServiceStatus | undefined>
  getLighthouseStatus(): Promise<LighthouseStatus | undefined>
}

const STATUS_EXPIRATION_TIME_MS = 1000 * 60 * 5 // 5mins

export async function createStatusComponent(
  components: Pick<BaseComponents, 'fetch' | 'logs' | 'config'>
): Promise<IStatusComponent> {
  const { fetch, logs, config } = components

  const logger = logs.getLogger('status-component')
  const lambdasUrl = new URL(await config.requireString('LAMBDAS_URL'))
  const contentUrl = new URL(await config.requireString('CONTENT_URL'))

  const fetchJson = async (url: string) => {
    const response = await fetch.fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })
    return response.json()
  }

  async function getLambdasHealth(): Promise<HealthStatus | undefined> {
    try {
      const data = await fetchJson(`${lambdasUrl}/health`)

      return {
        content: data['content'] === 'Healthy',
        lambdas: data['lambda'] === 'Healthy',
        comms: data['comms'] === 'Healthy'
      }
    } catch (err: any) {
      logger.error(err)
    }

    return undefined
  }

  let lastLambdasStatus: ServiceStatus | undefined = undefined
  async function getLambdasStatus() {
    if (lastLambdasStatus && Date.now() - lastLambdasStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastLambdasStatus
    }

    try {
      const data = await fetchJson(`${lambdasUrl}/status`)

      lastLambdasStatus = {
        time: Date.now(),
        version: data.catalystVersion,
        commitHash: data.commitHash,
        publicUrl: lambdasUrl.toString()
      }

      return lastLambdasStatus
    } catch (err: any) {
      logger.error(err)
    }

    return undefined
  }

  let lastContentStatus: ServiceStatus | undefined = undefined
  async function getContentStatus() {
    if (lastContentStatus && Date.now() - lastContentStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastContentStatus
    }

    try {
      const data = await fetchJson(`${contentUrl}/status`)

      lastContentStatus = {
        time: Date.now(),
        version: data.catalystVersion,
        commitHash: data.commitHash,
        publicUrl: contentUrl.toString()
      }

      return lastContentStatus
    } catch (err: any) {
      logger.error(err)
    }

    return undefined
  }

  let lastLighthouseStatus: LighthouseStatus | undefined = undefined

  async function getLighthouseStatus() {
    try {
      if (lastLighthouseStatus && Date.now() - lastLighthouseStatus.time < STATUS_EXPIRATION_TIME_MS) {
        return lastLighthouseStatus
      }

      const lighthouseUrl = await config.requireString('LIGHTHOUSE_URL')
      const data = await fetchJson(`${lighthouseUrl}/status`)

      lastLighthouseStatus = {
        time: Date.now(),
        realmName: data.name,
        version: data.version,
        commitHash: data.env.commitHash,
        usersCount: data.usersCount,
        publicUrl: lighthouseUrl
      }

      return lastLighthouseStatus
    } catch (e: any) {
      logger.warn(`Error fetching lighthouse status: ${e.toString()}`)
    }

    return undefined
  }

  return {
    getLambdasHealth,
    getLambdasStatus,
    getContentStatus,
    getLighthouseStatus
  }
}
