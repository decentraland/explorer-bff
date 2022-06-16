import { HandlerContextWithPath } from '../../types'

// handlers arguments only type what they need, to make unit testing easier
export async function statusHandler(
  context: Pick<HandlerContextWithPath<'metrics' | 'config', '/status'>, 'url' | 'components'>
) {
  const config = context.components.config
  return {
    body: {
      commitHash: await config.getString('COMMIT_HASH')
    }
  }
}
