import { test } from '../components'
import { Response } from 'node-fetch'
import { AboutResponse } from '../../src/protocol/decentraland/bff/http_endpoints'

test('fixed adapter about response', ({ beforeStart, components, spyComponents }) => {
  beforeStart(() => {
    Object.assign(process.env, {
      COMMS_MODE: 'fixed-adapter',
      COMMS_ADAPTER: 'ws:test-adapter.com'
    })
  })

  it('tests the about endpoint', async () => {
    const res = await components.localFetch.fetch('/about')
    const body = (await res.json()) as AboutResponse
    expect(body.comms).toEqual({ healthy: true, protocol: 'v3', fixedAdapter: 'ws:test-adapter.com' })
  })
})

test('archipelago adapter about response', ({ beforeStart, components, spyComponents }) => {
  beforeStart(() => {
    Object.assign(process.env, {
      COMMS_MODE: 'archipelago'
    })
  })

  it('tests the about endpoint', async () => {
    const res = await components.localFetch.fetch('/about')
    const body = (await res.json()) as AboutResponse
    expect(body.comms).toEqual({ healthy: false, protocol: 'v3' })
  })

  it('tests the about endpoint with mocked getClusterStatus', async () => {
    spyComponents.serviceDiscovery.getClusterStatus.mockResolvedValue({
      archipelago: {
        commitHash: 'deadbeef'
      }
    })
    const res = await components.localFetch.fetch('/about')
    const body = (await res.json()) as AboutResponse
    expect(body.comms).toEqual({ healthy: true, protocol: 'v3', commitHash: 'deadbeef' })
  })
})

test('lighthouse adapter about response', ({ beforeStart, components, spyComponents }) => {
  beforeStart(() => {
    Object.assign(process.env, {
      COMMS_MODE: 'lighthouse',
      PUBLIC_LIGHTHOUSE_URL: 'http://0.0.0.0:3000',
      HEALTHCHECK_LIGHTHOUSE_URL: 'http://0.0.0.0:3000'
    })
  })

  it('tests the about endpoint with mocked getLighthouseStatus', async () => {
    // prepare
    const getLighthouseStatus = spyComponents.status.getLighthouseStatus.mockResolvedValue({
      version: '123',
      commitHash: 'deadbeef',
      usersCount: 15,
      publicUrl: 'URL',
      realmName: 'ullathorpe',
      time: 1
    })
    const getName = spyComponents.realm.getName.mockResolvedValueOnce('realmName')

    // act
    const res = await components.localFetch.fetch('/about')
    const body = (await res.json()) as AboutResponse

    // assert
    expect(body.comms).toEqual({
      healthy: true,
      protocol: 'v2',
      commitHash: 'deadbeef',
      usersCount: 15,
      version: '123'
    })
    expect(body.configurations.realmName).toEqual('realmName')
    expect(getName).toHaveBeenCalledWith('ullathorpe')

    expect(getLighthouseStatus).toHaveBeenCalledTimes(2)
  })

  it('tests the about endpoint on 200', async () => {
    const statusCall = spyComponents.fetch.fetch.mockImplementation(
      async () =>
        new Response(
          JSON.stringify({
            name: 'hola',
            version: '333',
            env: { commitHash: 'asd' },
            usersCount: 15
          }),
          { status: 200 }
        )
    )
    const res = await components.localFetch.fetch('/about')
    const body = (await res.json()) as AboutResponse
    expect(body.comms).toEqual({
      healthy: true,
      protocol: 'v2',
      commitHash: 'asd',
      usersCount: 15,
      version: '333'
    })
    expect(statusCall.mock.calls[0][0]).toEqual('http://0.0.0.0:3000/status')
  })
})
