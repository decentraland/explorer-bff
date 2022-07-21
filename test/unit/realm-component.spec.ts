import { createLogComponent } from '@well-known-components/logger'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { createTestFetchComponent, FetchTestResponse } from '../helpers/fetch'
import { CATALYST_NAME_CONFIG_FILE, createRealmComponent } from '../../src/ports/realm'
import { BigNumber } from 'eth-connect'
import * as fs from 'fs/promises'

describe('realm-controller-unit', () => {
  const contracts = [
    { id: Buffer.from('0'), domain: 'https://catalyst-1', owner: '' },
    { id: Buffer.from('1'), domain: 'http://catalyst-2', owner: '' },
    { id: Buffer.from('2'), domain: 'catalyst-3', owner: '' }
  ]

  const contract = {
    catalystCount: () => Promise.resolve(new BigNumber(contracts.length)),
    catalystIds: (ix: number) => Promise.resolve(contracts[ix].id),
    catalystById: (id: Uint8Array) => Promise.resolve(contracts[Number.parseInt(id.toString())])
  }

  beforeEach(async () => {
    await fs.rm(CATALYST_NAME_CONFIG_FILE, { force: true })
  })

  it('should pick stored name if available', async () => {
    const handler = (_?: string): FetchTestResponse => {
      throw new Error('not implemnted')
    }

    await fs.writeFile(CATALYST_NAME_CONFIG_FILE, 'saved-name')

    const realm = await createRealmComponent({
      config: createConfigComponent({}),
      logs: createLogComponent({}),
      fetch: createTestFetchComponent(handler),
      contract
    })

    expect(await realm.getName()).toEqual('saved-name')
  })

  it('should pick local lighthouse name', async () => {
    const handler = (_?: string): FetchTestResponse => {
      throw new Error('not implemented')
    }

    const realm = await createRealmComponent({
      config: createConfigComponent({}),
      logs: createLogComponent({}),
      fetch: createTestFetchComponent(handler),
      contract
    })

    expect(await realm.getName('lighthouse-name')).toEqual('lighthouse-name')
    expect(await fs.readFile(CATALYST_NAME_CONFIG_FILE, { encoding: 'utf8' })).toEqual('lighthouse-name')
  })

  it('should pick a name from REALM_NAMES and check against catalysts', async () => {
    const config = {
      REALM_NAMES: 'catalyst-1,catalyst-3,catalyst-4'
    }

    const responses = {
      'https://catalyst-1/about': { configurations: { realmName: 'catalyst-1' } },
      'https://catalyst-3/comms/status': { name: 'catalyst-3' }
    }
    const handler = (url: string): FetchTestResponse => {
      const r = responses[url]
      if (r) {
        return { status: 200, body: r }
      }
      return { status: 404, body: {} }
    }

    const realm = await createRealmComponent({
      config: createConfigComponent(config),
      logs: createLogComponent({}),
      fetch: createTestFetchComponent(handler),
      contract
    })

    expect(await realm.getName()).toEqual('catalyst-4')
    expect(await fs.readFile(CATALYST_NAME_CONFIG_FILE, { encoding: 'utf8' })).toEqual('catalyst-4')
  })
})
