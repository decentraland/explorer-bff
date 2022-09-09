import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { GlobalContext } from '../../types'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'
import { WebSocket } from 'ws'

/**
 * This function attachs a WebSocket handler to the HTTP server
 * to upgrade the connection for the rpcServer
 */
export async function websocketRpcHandler(context: IHttpServerComponent.DefaultContext<GlobalContext>) {
  const { logs } = context.components
  const logger = logs.getLogger('ws')

  return upgradeWebSocketResponse((socket) => {
    let isAlive = true
    const ws = socket as any as WebSocket
    ws.on('pong', () => {
      isAlive = true
    })

    const pingInterval = setInterval(function ping() {
      if (isAlive === false) {
        logger.warn(`Terminating ws because of ping timeout`)
        return ws.terminate()
      }

      isAlive = false
      ws.ping()
    }, 30000)

    ws.on('close', () => {
      clearInterval(pingInterval)
    })

    // first we create an RPC WebSocketTransport
    const transport = WebSocketTransport(socket)
    // then we attach the transport to the rpcServer that will handle it
    context.components.rpcServer.attachTransport(transport, context)
    // log all transport errors
    transport.on('error', (err) => {
      if (err && err.message && !err.message.includes('Transport closed while waiting the ACK')) {
        logger.error(err)
      }
    })
  })
}
