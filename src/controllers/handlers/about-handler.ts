import { HandlerContextWithPath } from '../../types'
import {
  AboutResponse,
  AboutResponse_AboutConfiguration,
  AboutResponse_BffInfo,
  AboutResponse_CommsInfo,
  AboutResponse_ContentInfo,
  AboutResponse_LambdasInfo
} from '../bff-proto/http-endpoints'

// handlers arguments only type what they need, to make unit testing easier
export async function aboutHandler(
  context: Pick<
    HandlerContextWithPath<'serviceDiscovery' | 'status' | 'realm' | 'config' | 'rpcSessions' | 'metrics', '/about'>,
    'url' | 'components'
  >
) {
  const { realm, config, status, serviceDiscovery, rpcSessions } = context.components
  const commsProtocol = await config.requireString('COMMS_PROTOCOL')

  const configurations: AboutResponse_AboutConfiguration = {}
  const comms: AboutResponse_CommsInfo = {
    healthy: false,
    protocol: commsProtocol
  }
  const content: AboutResponse_ContentInfo = {
    healthy: false
  }
  const lambdas: AboutResponse_LambdasInfo = {
    healthy: false
  }
  const bff: AboutResponse_BffInfo = {
    healthy: true,
    commitHash: await config.getString('COMMIT_HASH'),
    userCount: rpcSessions.sessions.size
  }

  const [lambdasHealth, contentStatus, lambdasStatus] = await Promise.all([
    status.getLambdasHealth(),
    status.getContentStatus(),
    status.getLambdasStatus()
  ])

  if (lambdasHealth) {
    comms.healthy = lambdasHealth.comms
    content.healthy = lambdasHealth.content
    lambdas.healthy = lambdasHealth.lambdas
  }

  if (contentStatus) {
    const { version, commitHash } = contentStatus
    content.version = version
    content.commitHash = commitHash
  }

  if (lambdasStatus) {
    const { version, commitHash } = lambdasStatus
    lambdas.version = version
    lambdas.commitHash = commitHash
  }

  if (commsProtocol === 'v2') {
    const lighthouseStatus = await status.getLighthouseStatus()
    if (lighthouseStatus) {
      const { version, commitHash, realmName, usersCount } = lighthouseStatus
      comms.version = version
      comms.commitHash = commitHash
      comms.usersCount = usersCount
      configurations.realmName = await realm.getName(realmName)
    }
  } else {
    const clusterStatus = await serviceDiscovery.getClusterStatus()
    if (clusterStatus.archipelago) {
      comms.healthy = true
      comms.protocol = 'v3'
      comms.commitHash = clusterStatus.archipelago.commitHash
    } else {
      comms.healthy = false
    }
    configurations.realmName = await realm.getName()
  }

  const result: AboutResponse = {
    healthy: content.healthy && lambdas.healthy && comms.healthy,
    content,
    configurations,
    comms,
    lambdas,
    bff
  }

  return {
    status: result.healthy ? 200 : 503,
    body: result
  }
}
