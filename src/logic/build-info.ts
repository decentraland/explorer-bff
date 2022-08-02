import { AppComponents } from '../types'

export async function observeBuildInfo(components: Pick<AppComponents, 'config' | 'metrics'>) {
  const ethNetwork = (await components.config.getString('ETH_NETWORK')) ?? 'undefined'
  const commitHash = (await components.config.getString('COMMIT_HASH')) ?? 'undefined'
  const commsProtocol = (await components.config.getString('COMMS_PROTOCOL')) ?? 'undefined'
  components.metrics.observe('explorer_bff_build_info', { ethNetwork, commitHash, commsProtocol }, 1)
}
