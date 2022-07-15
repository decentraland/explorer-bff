import { HandlerContextWithPath } from '../../types'

export type About = {
  healthy: boolean
  configurations: {
    commsProtocol: string
  }
  content: {
    healthy: boolean
  }
  comms: {
    healthy: boolean
  }
  lambdas: {
    healthy: boolean
  }
}

// handlers arguments only type what they need, to make unit testing easier
export async function aboutHandler(
  context: Pick<
    HandlerContextWithPath<'serviceDiscovery' | 'logs' | 'metrics' | 'config' | 'fetch', '/explorer-configuration'>,
    'url' | 'components'
  >
) {
  const { logs, config, fetch, serviceDiscovery } = context.components

  const logger = logs.getLogger('explorer-configuration')
  const commsProtocol = await config.requireString('COMMS_PROTOCOL')
  const lambdasUrl = await config.requireString('LAMBDAS_URL')

  const body: About = {
    healthy: false,
    configurations: {
      commsProtocol
    },
    content: {
      healthy: false
    },
    comms: {
      healthy: false
    },
    lambdas: {
      healthy: false
    }
  }

  try {
    const response = await fetch.fetch(`${lambdasUrl}/health`, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      }
    })

    const data: Record<string, string> = await response.json()

    body.content.healthy = data['content'] === 'Healthy'
    body.lambdas.healthy = data['lambda'] === 'Healthy'
    body.comms.healthy = data['comms'] === 'Healthy'
  } catch (err: any) {
    logger.error(err)
  }

  if (commsProtocol === 'v3') {
    const clusterStatus = await serviceDiscovery.getClusterStatus()
    if (clusterStatus.archipelago) {
      body.comms = {
        healthy: true,
        ...clusterStatus.archipelago
      }
    } else {
      body.comms = {
        healthy: false
      }
    }
  }

  body.healthy = body.content.healthy && body.lambdas.healthy && body.comms.healthy

  return {
    status: body.healthy ? 200 : 503,
    body
  }
}
