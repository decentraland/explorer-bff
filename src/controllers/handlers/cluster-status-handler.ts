import { IHttpServerComponent } from '@well-known-components/interfaces'
import { GlobalContext } from '../../types'

// handlers arguments only type what they need, to make unit testing easier
export async function clusterStatusHandler(context: IHttpServerComponent.DefaultContext<GlobalContext>) {
  const clusterStatus = await context.components.serviceDiscovery.getClusterStatus()
  return {
    body: clusterStatus
  }
}
