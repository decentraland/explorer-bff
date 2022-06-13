import { WebSocketServer } from 'ws'

import { BaseComponents, WebSocketComponent } from '../types'

/**
 * Creates a http-server component
 * @public
 */
export async function createWsComponent(_: Pick<BaseComponents, 'logs'>): Promise<WebSocketComponent> {
  let wss: WebSocketServer | undefined

  async function start() {
    if (wss) return

    wss = new WebSocketServer({ noServer: true })
  }

  async function stop() {
    wss?.close()
    wss = undefined
  }

  await start()

  return {
    start,
    stop,
    ws: wss!
  }
}
