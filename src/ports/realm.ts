import { IBaseComponent } from '@well-known-components/interfaces'
import { BaseComponents } from '../types'
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
  getName(lighthouseName?: string): Promise<string | undefined>
}

export const CATALYST_NAME_CONFIG_FILE = '.catalyst-name'

/*
  The process of picking a name works as follows:

  1. If there is a file .catalyst-name, just the name there
  2. If the local lighthouse has a name, pick it, store it in .catalyst-name for next time
  3. If there is a no name, pick one from the env var REALM_NAMES (or defaultNames if the var is not provided), and ask every catalyst in the DAO if the name is already taken, if it's available, store it in .catalyst-name, otherwise repeat 
*/

export async function createRealmComponent(
  components: Pick<BaseComponents, 'config' | 'logs' | 'fetch' | 'contract'>
): Promise<IRealmComponent> {
  const { config, logs, fetch, contract } = components

  const logger = logs.getLogger('realm-component')

  let pickedName: string | undefined = undefined
  try {
    pickedName = await fs.readFile(CATALYST_NAME_CONFIG_FILE, { encoding: 'utf8' })
  } catch (e: any) {
    logger.debug(`Error reading catalyst name from ${CATALYST_NAME_CONFIG_FILE}: ${e.toString()}`)
  }

  async function storeName(name: string): Promise<void> {
    try {
      await fs.writeFile(CATALYST_NAME_CONFIG_FILE, name)
    } catch (e: any) {
      logger.error(`Error writing catalyst name to ${CATALYST_NAME_CONFIG_FILE}: ${e.toString()}`)
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
    const id = await contract.catalystIds(ix)
    const { domain } = await contract.catalystById(id)

    let baseUrl = domain.trim()

    if (baseUrl.startsWith('http://')) {
      logger.warn(`Catalyst node domain using http protocol, skipping ${baseUrl}`)
      return
    }

    if (!baseUrl.startsWith('https://')) {
      baseUrl = 'https://' + baseUrl
    }

    try {
      const statusResponse = await fetch.fetch(`${baseUrl}/about`)
      const data = await statusResponse.json()

      if (data && data.configurations) {
        return data.configurations.realmName
      }
    } catch (e: any) {
      logger.warn(`Error while getting the name (/about) of ${baseUrl}, id: ${id}: ${e.toString()}`)
    }

    try {
      const statusResponse = await fetch.fetch(`${baseUrl}/comms/status`)
      const data = await statusResponse.json()

      return data.name
    } catch (e: any) {
      logger.warn(`Error while getting the name (/comms/status) of ${baseUrl}, id: ${id}: ${e.toString()}`)
    }

    return
  }

  async function getName(lighthouseName?: string): Promise<string | undefined> {
    if (pickedName) {
      return pickedName
    }

    if (lighthouseName) {
      pickedName = lighthouseName
      await storeName(pickedName)
      return pickedName
    }

    const possiblesNames = await getOptions()
    const count = (await contract.catalystCount()).toNumber()

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
