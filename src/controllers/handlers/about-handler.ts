import { HandlerContextWithPath, DEFAULT_ETH_NETWORK } from '../../types'
import { AboutResponse } from '@dcl/protocol/out-js/decentraland/bff/http_endpoints.gen'
import { protobufPackage } from '@dcl/protocol/out-js/bff-services.gen'

const networkIds: Record<string, number> = {
  goerli: 5,
  mainnet: 1
}

// handlers arguments only type what they need, to make unit testing easier
export async function aboutHandler(
  context: Pick<
    HandlerContextWithPath<
      'status' | 'resourcesStatusCheck' | 'realm' | 'config' | 'rpcSessions' | 'metrics' | 'comms',
      '/about'
    >,
    'url' | 'components'
  >
) {
  const { realm, config, status, resourcesStatusCheck, rpcSessions } = context.components

  const ethNetwork = (await config.getString('ETH_NETWORK')) ?? DEFAULT_ETH_NETWORK
  const maxUsers = await config.getNumber('MAX_USERS')
  const networkId = networkIds[ethNetwork]

  const [lambdasHealth, contentStatus, lambdasStatus, resourcesOverload, comms, realmName] = await Promise.all([
    status.getLambdasHealth(),
    status.getContentStatus(),
    status.getLambdasStatus(),
    resourcesStatusCheck.areResourcesOverloaded(),
    context.components.comms.getStatus(),
    realm.getName()
  ])

  const healthy = lambdasHealth.lambdas && lambdasHealth.content && comms.healthy
  const userCount = rpcSessions.sessions.size + (comms.usersCount || 0)
  const acceptingUsers = healthy && !resourcesOverload && (!maxUsers || userCount < maxUsers)

  const result: AboutResponse = {
    healthy: healthy,
    content: {
      healthy: lambdasHealth.content,
      version: contentStatus.version,
      commitHash: contentStatus.commitHash,
      publicUrl: contentStatus.publicUrl
    },
    lambdas: {
      healthy: lambdasHealth.lambdas,
      version: lambdasStatus.version,
      commitHash: lambdasStatus.commitHash,
      publicUrl: lambdasStatus.publicUrl
    },
    configurations: {
      networkId,
      globalScenesUrn: [],
      scenesUrn: [],
      realmName
    },
    comms,
    bff: {
      healthy: true,
      version: await config.getString('CURRENT_VERSION'),
      commitHash: await config.getString('COMMIT_HASH'),
      userCount,
      protocolVersion: protobufPackage.replace('_', '.').replace(/^v/, ''),
      publicUrl: (await config.getString('BFF_PUBLIC_URL')) || '/'
    },
    acceptingUsers
  }

  return {
    status: result.healthy ? 200 : 503,
    body: result
  }
}
