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
    HandlerContextWithPath<'serviceDiscovery' | 'status' | 'realm' | 'config' | 'rpcSessions', '/about'>,
    'url' | 'components'
  >
) {
  const { realm, config, status, serviceDiscovery, rpcSessions } = context.components
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

  const [health, contentStatus, lambdasStatus] = await Promise.all([
    status.getLambdasHealth(),
    status.getContentStatus(),
    status.getLambdasStatus()
  ])

  if (health) {
    result.comms.healthy = health.comms
    result.content.healthy = health.content
    result.lambdas.healthy = health.lambdas
  }

  if (contentStatus) {
    const { version, commitHash } = contentStatus
    result.content.version = version
    result.content.commitHash = commitHash
  }

  if (lambdasStatus) {
    const { version, commitHash } = lambdasStatus
    result.lambdas.version = version
    result.lambdas.commitHash = commitHash
  }

  if (commsProtocol === 'v2') {
    const lighthouseStatus = await status.getLighthouseStatus()
    if (lighthouseStatus) {
      const { version, commitHash, realmName } = lighthouseStatus
      result.comms.version = version
      result.comms.commitHash = commitHash
      result.configurations.realmName = await realm.getName(realmName)
    }
  } else {
    const clusterStatus = await serviceDiscovery.getClusterStatus()
    if (clusterStatus.archipelago) {
      result.comms.healthy = true
      result.comms.protocol = 'v3'
      result.comms.commitHash = clusterStatus.archipelago.commitHash
    } else {
      result.comms.healthy = false
    }
    result.configurations.realmName = await realm.getName()
  }

  result.healthy = result.content.healthy && result.lambdas.healthy && result.comms.healthy

  return {
    status: result.healthy ? 200 : 503,
    body: result
  }
}
