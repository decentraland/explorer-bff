import { WebSocketServer } from 'ws'

import { BaseComponents, WebSocketComponent } from '../types'

/**
 * Creates a http-server component
 * @public
 */
export async function createWsComponent(components: Pick<BaseComponents, 'logs'>): Promise<WebSocketComponent> {
  const { logs } = components
  const logger = logs.getLogger('ws')
  let wss: WebSocketServer | undefined

  async function start() {
    if (wss) return

    wss = new WebSocketServer({ noServer: true })
    wss.on('connection', (ws) => {
      setInterval(() => {
        ws.send('hola')
      }, 1000)

      ws.on('message', function message(data: any) {
        logger.log(`Received message ${data} from user ${ws}`)
      })
    })
  }

  async function stop() {
    wss?.close()
    wss = undefined
  }

  start()

  return {
    start,
    stop,
    ws: wss!
  }
}
