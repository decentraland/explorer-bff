import { HandlerContextWithPath } from '../../types'

export type About = {
  healthy: boolean
  configurations: {
    realmName?: string
  }
  content: {
    healthy: boolean
    version?: string
    commitHash?: string
  }
  comms: {
    protocol: string
    healthy: boolean
    version?: string
    commitHash?: string
  }
  lambdas: {
    healthy: boolean
    version?: string
    commitHash?: string
  }
  bff: {
    healthy: boolean
    commitHash?: string
  }
}

// handlers arguments only type what they need, to make unit testing easier
export async function aboutHandler(
  context: Pick<
    HandlerContextWithPath<'serviceDiscovery' | 'realm' | 'logs' | 'metrics' | 'config' | 'fetch', '/about'>,
    'url' | 'components'
  >
) {
  const { logs, realm, config, fetch, serviceDiscovery } = context.components

  const logger = logs.getLogger('explorer-configuration')
  const commsProtocol = await config.requireString('COMMS_PROTOCOL')
  const lambdasUrl = await config.requireString('LAMBDAS_URL')
  const contentUrl = await config.requireString('CONTENT_URL')

  const result: About = {
    healthy: false,
    content: {
      healthy: false
    },
    configurations: {
      realmName: undefined
    },
    comms: {
      protocol: commsProtocol,
      healthy: false
    },
    lambdas: {
      healthy: false
    },
    bff: {
      healthy: true,
      commitHash: await config.getString('COMMIT_HASH')
    }
  }

  try {
    const response = await fetch.fetch(`${lambdasUrl}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    const data: Record<string, string> = await response.json()

    result.content.healthy = data['content'] === 'Healthy'
    result.lambdas.healthy = data['lambda'] === 'Healthy'
    result.comms.healthy = data['comms'] === 'Healthy'
  } catch (err: any) {
    logger.error(err)
  }

  try {
    const response = await fetch.fetch(`${lambdasUrl}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    const data = await response.json()

    result.lambdas.version = data.version
    result.lambdas.commitHash = data.commitHash
  } catch (err: any) {
    logger.error(err)
  }

  try {
    const response = await fetch.fetch(`${contentUrl}/status`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    const data = await response.json()

    result.content.version = data.version
    result.content.commitHash = data.commitHash
  } catch (err: any) {
    logger.error(err)
  }

  let lighthouseRealmName: string | undefined = undefined
  if (commsProtocol === 'v2') {
    const lighthouseUrl = await config.requireString('LIGHTHOUSE_URL')
    try {
      const response = await fetch.fetch(`${lighthouseUrl}/status`, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      })
      const data = await response.json()

      result.comms.version = data.version
      result.comms.commitHash = data.env.commitHash

      lighthouseRealmName = data.name
    } catch (e: any) {
      logger.warn(`Error fetching ${lighthouseUrl}/status: ${e.toString()}`)
    }
  } else {
    const clusterStatus = await serviceDiscovery.getClusterStatus()
    if (clusterStatus.archipelago) {
      result.comms = {
        ...result.comms,
        healthy: true,
        ...clusterStatus.archipelago
      }
    } else {
      result.comms.healthy = false
    }
  }

  result.configurations.realmName = await realm.getName(lighthouseRealmName)
  result.healthy = result.content.healthy && result.lambdas.healthy && result.comms.healthy

  return {
    status: result.healthy ? 200 : 503,
    body: result
  }
}
