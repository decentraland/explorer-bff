import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { GlobalContext } from '../../types'
import { WebSocketTransport } from '@dcl/rpc/dist/transports/WebSocket'

/**
 * This function attachs a WebSocket handler to the HTTP server
 * to upgrade the connection for the rpcServer
 */
export async function websocketRpcHandler(context: IHttpServerComponent.DefaultContext<GlobalContext>) {
  return upgradeWebSocketResponse((socket) => {
    // first we create an RPC WebSocketTransport
    const transport = WebSocketTransport(socket)
    // then we attach the transport to the rpcServer that will handle it
    context.components.rpcServer.attachTransport(transport, context)
  })
}
