import { AboutResponse_CommsInfo } from '../controllers/bff-proto/http-endpoints'
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
        publicUrl: adapter
      }
      return comms
    }
  }
}
