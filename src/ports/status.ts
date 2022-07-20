import { IBaseComponent } from '@well-known-components/interfaces'
import { BaseComponents } from '../types'

export type ServiceStatus = {
  time: number
  version: string
  commitHash: string
}

export type LighthouseStatus = ServiceStatus & {
  realmName: string
}

export type IStatusComponent = IBaseComponent & {
  getLambdasStatus(): Promise<ServiceStatus | undefined>
  getContentStatus(): Promise<ServiceStatus | undefined>
  getLighthouseStatus(): Promise<LighthouseStatus | undefined>
}

const STATUS_EXPIRATION_TIME_MS = 1000 * 60 * 5

export async function createStatusComponent(
  components: Pick<BaseComponents, 'fetch' | 'logs' | 'config'>
): Promise<IStatusComponent> {
  const { fetch, logs, config } = components

  const logger = logs.getLogger('status-component')

  const fetchJson = async (url: string) => {
    const response = await fetch.fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })
    return response.json()
  }

  const lambdasUrl = await config.requireString('LAMBDAS_URL')
  let lastLambdasStatus: ServiceStatus | undefined = undefined
  async function getLambdasStatus() {
    if (lastLambdasStatus && Date.now() - lastLambdasStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastLambdasStatus
    }

    try {
      const data = await fetchJson(`${lambdasUrl}/status`)

      lastLambdasStatus = {
        time: Date.now(),
        version: data.version,
        commitHash: data.commitHash
      }

      return lastLambdasStatus
    } catch (err: any) {
      logger.error(err)
    }

    return undefined
  }

  const contentUrl = await config.requireString('CONTENT_URL')
  let lastContentStatus: ServiceStatus | undefined = undefined
  async function getContentStatus() {
    if (lastContentStatus && Date.now() - lastContentStatus.time < STATUS_EXPIRATION_TIME_MS) {
      return lastContentStatus
    }

    try {
      const data = await fetchJson(`${contentUrl}/status`)

      lastContentStatus = {
        time: Date.now(),
        version: data.version,
        commitHash: data.commitHash
      }

      return lastContentStatus
    } catch (err: any) {
      logger.error(err)
    }

    return undefined
  }

  const lighthouseUrl = await config.requireString('LIGHTHOUSE_URL')
  let lastLighthouseStatus: LighthouseStatus | undefined = undefined

  async function getLighthouseStatus() {
    try {
      if (lastLighthouseStatus && Date.now() - lastLighthouseStatus.time < STATUS_EXPIRATION_TIME_MS) {
        return lastLighthouseStatus
      }

      const data = await fetchJson(`${lighthouseUrl}/status`)

      lastLighthouseStatus = {
        time: Date.now(),
        realmName: data.name,
        version: data.version,
        commitHash: data.env.commitHash
      }

      return lastLighthouseStatus
    } catch (e: any) {
      logger.warn(`Error fetching ${lighthouseUrl}/status: ${e.toString()}`)
    }

    return undefined
  }

  return {
    getLambdasStatus,
    getContentStatus,
    getLighthouseStatus
  }
}
