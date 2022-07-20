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
    userCount: number
  }
}

// handlers arguments only type what they need, to make unit testing easier
export async function aboutHandler(
  context: Pick<
    HandlerContextWithPath<
      'serviceDiscovery' | 'status' | 'realm' | 'logs' | 'config' | 'fetch' | 'rpcSessions',
      '/about'
    >,
    'url' | 'components'
  >
) {
  const { logs, realm, config, fetch, status, serviceDiscovery, rpcSessions } = context.components

  const logger = logs.getLogger('about')
  const commsProtocol = await config.requireString('COMMS_PROTOCOL')

  const userCount = rpcSessions.sessions.size
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
      commitHash: await config.getString('COMMIT_HASH'),
      userCount
    }
  }

  try {
    const lambdasUrl = await config.requireString('LAMBDAS_URL')
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

  const contentStatus = await status.getContentStatus()
  if (contentStatus) {
    const { version, commitHash } = contentStatus
    result.content.version = version
    result.content.commitHash = commitHash
  }

  const lambdasStatus = await status.getLambdasStatus()
  if (lambdasStatus) {
    const { version, commitHash } = lambdasStatus
    result.lambdas.version = version
    result.lambdas.commitHash = commitHash
  }

  let lighthouseRealmName: string | undefined = undefined
  if (commsProtocol === 'v2') {
    const lighthouseStatus = await status.getLighthouseStatus()
    if (lighthouseStatus) {
      const { version, commitHash, realmName } = lighthouseStatus
      result.comms.version = version
      result.comms.commitHash = commitHash
      lighthouseRealmName = realmName
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
