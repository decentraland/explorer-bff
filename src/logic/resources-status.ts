import { AppComponents } from '../types'
import os from 'node-os-utils'

export type IResourcesStatusComponent = {
  areResourcesOverloaded: () => Promise<boolean>
}

function isAboveNinetyPercent(measure: number) {
  return measure > 90
}

const getResourcersUsage = async (): Promise<{ cpuLoad: number; memLoad: number }> => {
  const cpu = await os.cpu.usage()
  const mem = await os.mem.used()

  return { cpuLoad: cpu, memLoad: (mem.usedMemMb * 100) / mem.totalMemMb }
}

export function createResourcesStatusComponent(components: Pick<AppComponents, 'logs'>): IResourcesStatusComponent {
  async function areResourcesOverloaded(): Promise<boolean> {
    const logger = components.logs.getLogger('status-checker')
    let resourcesAreOverloaded = false

    const { cpuLoad, memLoad } = await getResourcersUsage()

    if (isAboveNinetyPercent(cpuLoad)) {
      resourcesAreOverloaded = true
      logger.info(`CPU usage is above 90%: ${cpuLoad.toFixed(2)}%`)
    }

    if (isAboveNinetyPercent(memLoad)) {
      resourcesAreOverloaded = true
      logger.info(`Memory usage is above 90%: ${memLoad.toFixed(2)}%`)
    }

    return resourcesAreOverloaded
  }

  return { areResourcesOverloaded }
}
