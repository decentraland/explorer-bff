import { AppComponents } from '../types'
import os from 'os'

export type IResourcesStatusComponent = {
  areResourcesOverloaded: () => Promise<boolean>
}

function isAboveNinetyPercent(measure: number) {
  return measure > 90
}

const getResourcesLoad = async (): Promise<{ cpuLoad: number; memLoad: number }> => {
  const cpuAvgLoad = os.loadavg()
  const coresQuantity = os.cpus().length
  const cpuLoad = (cpuAvgLoad[0] * 100) / coresQuantity

  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem
  const memLoad = (usedMem * 100) / totalMem

  return { cpuLoad, memLoad }
}

export function createResourcesStatusComponent(components: Pick<AppComponents, 'logs'>): IResourcesStatusComponent {
  const logger = components.logs.getLogger('status-checker')
  async function areResourcesOverloaded(): Promise<boolean> {
    let resourcesAreOverloaded = false

    const { cpuLoad, memLoad } = await getResourcesLoad()
    logger.info('System load', { cpuLoad: `${cpuLoad.toFixed(2)}%`, memLoad: `${memLoad.toFixed(2)}%` })

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
