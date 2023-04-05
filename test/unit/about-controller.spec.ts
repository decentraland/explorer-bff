import { test } from '../components'
import { Response } from 'node-fetch'
import { AboutResponse } from '@dcl/protocol/out-js/decentraland/bff/http_endpoints.gen'

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
