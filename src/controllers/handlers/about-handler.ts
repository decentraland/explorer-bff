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
    HandlerContextWithPath<'status' | 'realm' | 'config' | 'rpcSessions' | 'metrics' | 'comms', '/about'>,
    'url' | 'components'
  >
) {
  const { realm, config, status, rpcSessions } = context.components

  const ethNetwork = (await config.getString('ETH_NETWORK')) ?? DEFAULT_ETH_NETWORK
  const maxUsers = await config.getNumber('MAX_USERS')
  const networkId = networkIds[ethNetwork]

  const comms = await context.components.comms.getStatus()

  const [lambdasHealth, contentStatus, lambdasStatus] = await Promise.all([
    status.getLambdasHealth(),
    status.getContentStatus(),
    status.getLambdasStatus()
  ])

  let realmName: string | undefined
  if (comms.protocol === 'v2') {
    const lighthouseStatus = await status.getLighthouseStatus()
    realmName = await realm.getName(lighthouseStatus?.realmName)
  } else {
    realmName = await realm.getName()
  }

  const healthy = lambdasHealth.lambdas && lambdasHealth.content && comms.healthy
  const userCount = rpcSessions.sessions.size
  const acceptingUsers = healthy && (!maxUsers || userCount < maxUsers)
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
