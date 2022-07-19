import { IBaseComponent } from '@well-known-components/interfaces'
import { BaseComponents } from '../types'
import { DAOContract } from '@dcl/catalyst-contracts'
import * as fs from 'fs/promises'

export const defaultNames = [
  'zeus',
  'poseidon',
  'athena',
  'hera',
  'hephaestus',
  'aphrodite',
  'hades',
  'hermes',
  'artemis',
  'thor',
  'loki',
  'odin',
  'freyja',
  'fenrir',
  'heimdallr',
  'baldr'
]

export type IRealmComponent = IBaseComponent & {
  getName(commsProtocol: string): Promise<string | undefined>
}

const DEFAULT_ETH_NETWORK = 'ropsten'

const CURRENT_ETH_NETWORK = process.env.ETH_NETWORK ?? DEFAULT_ETH_NETWORK
const CATALYST_NAME_CONFIG_FILE = '.catalyst-name'

export async function createRealmComponent(
  components: Pick<BaseComponents, 'config' | 'logs'>
): Promise<IRealmComponent> {
  const { config, logs } = components

  let pickedName: string | undefined = undefined
  const logger = logs.getLogger('realm-component')
  const contract = DAOContract.withNetwork(CURRENT_ETH_NETWORK)

  async function storeName(name: string): Promise<void> {
    try {
      await fs.writeFile(CATALYST_NAME_CONFIG_FILE, name)
    } catch (e: any) {
      logger.error(`Error writing catalyst name to ${CATALYST_NAME_CONFIG_FILE}: ${e.toString()}`)
    }
  }

  async function readSavedName(): Promise<string | undefined> {
    try {
      const data = await fs.readFile(CATALYST_NAME_CONFIG_FILE, { encoding: 'utf8' })
      return data
    } catch (e: any) {
      logger.debug(`Error reading catalyst name from ${CATALYST_NAME_CONFIG_FILE}: ${e.toString()}`)
      return
    }
  }

  async function getOptions(): Promise<string[]> {
    const configuredNames = await config.getString('REALM_NAMES')
    if (!configuredNames) {
      return defaultNames
    }
    return configuredNames.split(',')
  }

  async function resolveCatalystName(ix: number): Promise<string | undefined> {
    const id = await contract.getCatalystIdByIndex(ix)

    const { domain } = await contract.getServerData(id)

    let baseUrl = domain.trim()

    if (baseUrl.startsWith('http://')) {
      logger.warn(`Catalyst node domain using http protocol, skipping ${baseUrl}`)
      return
    }

    if (!baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl
    }

    let name: string | undefined = undefined

    // Timeout is an option that is supported server side, but not browser side, so it doesn't compile if we don't cast it to any
    try {
      const statusResponse = await fetch(`${baseUrl}/about`, { timeout: 5000 } as any)
      const json = await statusResponse.json()

      if (json && json.configurations) {
        name = json.configurations.realmName
      }
    } catch (e: any) {
      logger.warn(`Error while getting the name (/about) of ${baseUrl}, id: ${id}: ${e.toString()}`)
      return
    }

    if (name) {
      return name
    }

    try {
      const statusResponse = await fetch(`${baseUrl}/comms/status`, { timeout: 5000 } as any)
      const json = await statusResponse.json()

      name = json.name
    } catch (e: any) {
      logger.warn(`Error while getting the name (/comms/status) of ${baseUrl}, id: ${id}: ${e.toString()}`)
    }

    return name
  }

  async function getName(commsProtocol: string): Promise<string | undefined> {
    if (pickedName) {
      return pickedName
    }

    const savedName = await readSavedName()
    if (savedName) {
      pickedName = savedName
      return pickedName
    }

    if (commsProtocol === 'v2') {
      const lighthouseUrl = config.requireString('LIGHTHOUSE_URL')
      try {
        const statusResponse = await fetch(`${lighthouseUrl}/comms/status`, { timeout: 5000 } as any)
        const json = await statusResponse.json()

        pickedName = json.name
        if (pickedName) {
          await storeName(pickedName)
          return pickedName
        }
      } catch (e: any) {
        logger.warn(`Error while getting name from local lighthouse: ${e.toString()}`)
      }
    }

    const possiblesNames = await getOptions()
    const count = await contract.getCount()

    const catalystNamePromises: Promise<string | undefined>[] = []
    for (let i = 0; i < count; i++) {
      catalystNamePromises.push(resolveCatalystName(i))
    }

    const existingNames = new Set(await Promise.all(catalystNamePromises))

    for (const name of possiblesNames) {
      if (!existingNames.has(name)) {
        pickedName = name
        await storeName(pickedName)
        break
      }
    }

    if (!pickedName) {
      logger.error('Could not set my name! All names already taken')
    }

    return pickedName
  }

  return {
    getName
  }
}
