import { HandlerContextWithPath } from '../../types'

export type ExplorerConfiguration = {
  configurations: {
    commsProtocol: string
  }
}

// handlers arguments only type what they need, to make unit testing easier
export async function explorerConfigurationHandler(
  context: Pick<HandlerContextWithPath<'metrics' | 'config', '/explorer-configuration'>, 'url' | 'components'>
) {
  const { config } = context.components

  const body: ExplorerConfiguration = {
    configurations: {
      commsProtocol: await config.requireString('COMMS_PROTOCOL')
    }
  }

  return {
    body
  }
}
