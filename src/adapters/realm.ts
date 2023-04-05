import { IBaseComponent } from '@well-known-components/interfaces'
import { BaseComponents } from '../types'
import * as fs from 'fs/promises'
import * as path from 'path'

export const defaultNames = ['zeus', 'poseidon', 'hera', 'aphrodite', 'hades', 'hermes', 'thor', 'freyja', 'fenrir']

export type IRealmComponent = IBaseComponent & {
  getName(lighthouseName?: string): Promise<string | undefined>
}

export const CATALYST_NAME_CONFIG_FILE = '.catalyst-name'

/*
  The process of picking a name follows the next rules in order:

  1. If there is a file .catalyst-name, just use the name there
  2. If the local lighthouse has a name, pick it, store it in .catalyst-name for next time
  3. If there is no name, pick one from the list in the env var `REALM_NAMES` (or use `defaultNames` if the var is not provided),  and ask every catalyst in the DAO if the name is already taken, if it's available, store it in .catalyst-name, otherwise repeat
*/

export async function createRealmComponent(
  components: Pick<BaseComponents, 'config' | 'logs' | 'fetch' | 'contract'>
): Promise<IRealmComponent> {
  const { config, logs, fetch, contract } = components

  const logger = logs.getLogger('realm-component')

  const storageLocation = (await config.getString('STORAGE_LOCATION')) || './'
  const configFile = path.join(storageLocation, CATALYST_NAME_CONFIG_FILE)

  let pickedName: string | undefined = undefined
  try {
    pickedName = await fs.readFile(configFile, { encoding: 'utf8' })
  } catch (e: any) {
    logger.debug(`Error reading catalyst name from ${configFile}: ${e.toString()}`)
  }

  async function storeName(name: string): Promise<void> {
    try {
      await fs.writeFile(configFile, name)
    } catch (e: any) {
      logger.error(`Error writing catalyst name to ${configFile}: ${e.toString()}`)
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
