import { AboutResponse_CommsInfo } from '../protocol/decentraland/bff/http_endpoints'
import { AppComponents } from '../types'
import { ICommsModeComponent } from './comms-fixed-adapter'

export async function commsLighthouse(components: Pick<AppComponents, 'status'>): Promise<ICommsModeComponent> {
  const { status } = components

  return {
    async getStatus() {
      const comms: AboutResponse_CommsInfo = {
        healthy: false,
        protocol: 'v2'
      }
      const lighthouseStatus = await status.getLighthouseStatus()
      if (lighthouseStatus) {
        const { version, commitHash, usersCount } = lighthouseStatus
        comms.version = version
        comms.commitHash = commitHash
        comms.usersCount = usersCount
        comms.healthy = true
      }
      return comms
    }
  }
}
