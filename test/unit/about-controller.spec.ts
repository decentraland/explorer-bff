import { createLogComponent } from '@well-known-components/logger'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { IFetchComponent } from '@well-known-components/http-server'
import { aboutHandler } from '../../src/controllers/handlers/about-handler'
import * as node_fetch from 'node-fetch'

type FetchTestResponse = {
  status: number
  body: Record<string, string>
}

function createTestFetchComponent(handler: (url: string) => FetchTestResponse): IFetchComponent {
  const fetch: IFetchComponent = {
    async fetch(info: node_fetch.RequestInfo, _?: node_fetch.RequestInit): Promise<node_fetch.Response> {
      const url = info.toString()
      const { body, status } = handler(url)
      const response = new node_fetch.Response(JSON.stringify(body), {
        status,
        url
      })
      return response
    }
  }

  return fetch
}

function testAbout(config: Record<string, string>, lambdaResponse: FetchTestResponse, clusterStatus: any) {
  const handler = (_: string): FetchTestResponse => {
    return lambdaResponse
  }

  return aboutHandler({
    url: new URL('https://bff/about'),
    components: {
      serviceDiscovery: {
        getClusterStatus: () => Promise.resolve(clusterStatus),
        stop: () => Promise.resolve()
      },
      logs: createLogComponent(),
      config: createConfigComponent(config),
      fetch: createTestFetchComponent(handler)
    }
  })
}

describe('about-controller-unit', () => {
  it('v2 - services are healthy', async () => {
    const config = {
      COMMS_PROTOCOL: 'v2',
      LAMBDAS_URL: 'lambdas'
    }
    const response = await testAbout(
      config,
      {
        status: 200,
        body: {
          lambda: 'Healthy',
          content: 'Healthy',
          comms: 'Healthy'
        }
      },
      {}
    )

    expect(response.status).toEqual(200)
    expect(response.body.healthy).toEqual(true)
    expect(response.body.configurations.commsProtocol).toEqual('v2')
    expect(response.body.content.healthy).toEqual(true)
    expect(response.body.lambdas.healthy).toEqual(true)
    expect(response.body.comms.healthy).toEqual(true)
  })

  it('v2 - content is not healthy', async () => {
    const config = {
      COMMS_PROTOCOL: 'v2',
      LAMBDAS_URL: 'lambdas'
    }
    const response = await testAbout(
      config,
      {
        status: 503,
        body: {
          lambda: 'Healthy',
          content: 'Unhealthy',
          comms: 'Healthy'
        }
      },
      {}
    )

    expect(response.status).toEqual(503)
    expect(response.body.healthy).toEqual(false)
    expect(response.body.configurations.commsProtocol).toEqual('v2')
    expect(response.body.content.healthy).toEqual(false)
    expect(response.body.lambdas.healthy).toEqual(true)
    expect(response.body.comms.healthy).toEqual(true)
  })

  it('v2 - lambdas is not healthy', async () => {
    const config = {
      COMMS_PROTOCOL: 'v2',
      LAMBDAS_URL: 'lambdas'
    }
    const response = await testAbout(
      config,
      {
        status: 500,
        body: {}
      },
      {}
    )

    expect(response.status).toEqual(503)
    expect(response.body.healthy).toEqual(false)
    expect(response.body.configurations.commsProtocol).toEqual('v2')
    expect(response.body.content.healthy).toEqual(false)
    expect(response.body.lambdas.healthy).toEqual(false)
    expect(response.body.comms.healthy).toEqual(false)
  })

  it('v3 - services are healthy', async () => {
    const config = {
      COMMS_PROTOCOL: 'v3',
      LAMBDAS_URL: 'lambdas'
    }
    const response = await testAbout(
      config,
      {
        status: 200,
        body: {
          lambda: 'Healthy',
          content: 'Healthy',
          comms: 'Unhealthy'
        }
      },
      {
        archipelago: {}
      }
    )

    expect(response.status).toEqual(200)
    expect(response.body.healthy).toEqual(true)
    expect(response.body.configurations.commsProtocol).toEqual('v3')
    expect(response.body.content.healthy).toEqual(true)
    expect(response.body.lambdas.healthy).toEqual(true)
    expect(response.body.comms.healthy).toEqual(true)
  })

  it('v3 - content is not healthy', async () => {
    const config = {
      COMMS_PROTOCOL: 'v3',
      LAMBDAS_URL: 'lambdas'
    }
    const response = await testAbout(
      config,
      {
        status: 503,
        body: {
          lambda: 'Healthy',
          content: 'Unhealthy',
          comms: 'Healthy'
        }
      },
      {
        archipelago: {}
      }
    )

    expect(response.status).toEqual(503)
    expect(response.body.healthy).toEqual(false)
    expect(response.body.configurations.commsProtocol).toEqual('v3')
    expect(response.body.content.healthy).toEqual(false)
    expect(response.body.lambdas.healthy).toEqual(true)
    expect(response.body.comms.healthy).toEqual(true)
  })

  it('v3 - lambdas is not healthy', async () => {
    const config = {
      COMMS_PROTOCOL: 'v3',
      LAMBDAS_URL: 'lambdas'
    }
    const response = await testAbout(
      config,
      {
        status: 500,
        body: {}
      },
      {
        archipelago: {}
      }
    )

    expect(response.status).toEqual(503)
    expect(response.body.healthy).toEqual(false)
    expect(response.body.configurations.commsProtocol).toEqual('v3')
    expect(response.body.content.healthy).toEqual(false)
    expect(response.body.lambdas.healthy).toEqual(false)
    expect(response.body.comms.healthy).toEqual(true)
  })

  it('v3 - comms is not healthy', async () => {
    const config = {
      COMMS_PROTOCOL: 'v3',
      LAMBDAS_URL: 'lambdas'
    }
    const response = await testAbout(
      config,
      {
        status: 503,
        body: {
          lambda: 'Healthy',
          content: 'Healthy',
          comms: 'Healthy'
        }
      },
      {}
    )

    expect(response.status).toEqual(503)
    expect(response.body.healthy).toEqual(false)
    expect(response.body.configurations.commsProtocol).toEqual('v3')
    expect(response.body.content.healthy).toEqual(true)
    expect(response.body.lambdas.healthy).toEqual(true)
    expect(response.body.comms.healthy).toEqual(false)
  })
})
