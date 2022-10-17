import { AboutResponse_CommsInfo } from '@dcl/protocol/out-ts/decentraland/bff/http_endpoints.gen'
import { AppComponents } from '../types'

export type ICommsModeComponent = {
  getStatus(): Promise<AboutResponse_CommsInfo>
}

export async function commsFixedAdapter(components: Pick<AppComponents, 'config'>): Promise<ICommsModeComponent> {
  const { config } = components

  const adapter = await config.requireString('COMMS_ADAPTER')

  return {
    async getStatus() {
      const comms: AboutResponse_CommsInfo = {
        healthy: true,
        protocol: 'v3',
        fixedAdapter: adapter
      }
      return comms
    }
  }
}
