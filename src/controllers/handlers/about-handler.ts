import { HandlerContextWithPath } from '../../types'
import {
  AboutResponse,
  AboutResponse_AboutConfiguration,
  AboutResponse_BffInfo,
  AboutResponse_CommsInfo,
  AboutResponse_ContentInfo,
  AboutResponse_LambdasInfo
} from '../../protocol/bff/http-endpoints'

// handlers arguments only type what they need, to make unit testing easier
export async function aboutHandler(
  context: Pick<
    HandlerContextWithPath<'status' | 'realm' | 'config' | 'rpcSessions' | 'metrics' | 'comms', '/about'>,
    'url' | 'components'
  >
) {
  const { realm, config, status, rpcSessions } = context.components

  const configurations: AboutResponse_AboutConfiguration = {}
  const comms = await context.components.comms.getStatus()
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
    content.healthy = lambdasHealth.content
    lambdas.healthy = lambdasHealth.lambdas
  }

  if (contentStatus) {
    const { version, commitHash, publicUrl } = contentStatus
    content.version = version
    content.commitHash = commitHash
    content.publicUrl = publicUrl
  }

  if (lambdasStatus) {
    const { version, commitHash, publicUrl } = lambdasStatus
    lambdas.version = version
    lambdas.commitHash = commitHash
    lambdas.publicUrl = publicUrl
  }

  if (comms.protocol === 'v2') {
    const lighthouseStatus = await status.getLighthouseStatus()
    configurations.realmName = await realm.getName(lighthouseStatus?.realmName)
  } else {
    configurations.realmName = await realm.getName()
  }

  bff.publicUrl = (await config.getString('BFF_PUBLIC_URL')) || '/'

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
