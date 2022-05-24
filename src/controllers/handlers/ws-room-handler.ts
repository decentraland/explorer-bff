import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { WebSocket } from 'ws'
import { GlobalContext } from '../../types'
import { WsMessage } from '../proto/ws'
import { verify } from 'jsonwebtoken'
import { Reader } from 'protobufjs/minimal'

const connectionsPerRoom = new Map<string, Set<WebSocket>>()

function getConnectionsList(roomId: string): Set<WebSocket> {
  let set = connectionsPerRoom.get(roomId)
  if (!set) {
    set = new Set()
    connectionsPerRoom.set(roomId, set)
  }
  return set
}

let connectionCounter = 0

const aliasToUserId = new Map<number, string>()

export async function websocketRoomHandler(
  context: IHttpServerComponent.DefaultContext<GlobalContext> & IHttpServerComponent.PathAwareContext<GlobalContext>
) {
  const logger = context.components.logs.getLogger('Websocket Room Handler')
  logger.info('Websocket')
  const roomId = context.params.roomId || 'I1' // TODO: Validate params
  const connections = getConnectionsList(roomId)

  const secret = process.env.WS_ROOM_SERVICE_SECRET

  if (!secret) {
    throw new Error('Missing ws room service auth secret')
  }

  return upgradeWebSocketResponse((socket) => {
    logger.info('Websocket connected')
    // TODO fix ws types
    const ws = socket as any as WebSocket

    connections.add(ws)

    const alias = ++connectionCounter

    const query = context.url.searchParams
    const token = query.get('access_token') as string

    let userId: string
    try {
      // TODO: validate audience
      const decodedToken = verify(token, secret) as any
      userId = decodedToken['peerId'] as string
    } catch (err) {
      logger.error(err as Error)
      ws.close()
      return
    }

    aliasToUserId.set(alias, userId)

    ws.on('message', (rawMessage) => {
      let message: WsMessage
      try {
        message = WsMessage.decode(Reader.create(rawMessage as Buffer))
      } catch (e: any) {
        logger.error(`cannot process ws message ${e.toString()}`)
        return
      }

      if (!message.data) {
        return
      }

      const { $case } = message.data

      switch ($case) {
        case 'systemMessage': {
          const { systemMessage } = message.data
          systemMessage.fromAlias = alias

          const d = WsMessage.encode({
            data: {
              $case: 'systemMessage',
              systemMessage
            }
          }).finish()

          // Reliable/unreliable data
          connections.forEach(($) => {
            if (ws !== $) {
              $.send(d)
            }
          })
          break
        }
        case 'identityMessage': {
          const { identityMessage } = message.data
          identityMessage.fromAlias = alias
          identityMessage.identity = userId

          const d = WsMessage.encode({
            data: {
              $case: 'identityMessage',
              identityMessage
            }
          }).finish()

          // Reliable/unreliable data
          connections.forEach(($) => {
            if (ws !== $) {
              $.send(d)
            }
          })
          break
        }
        default: {
          logger.log(`ignoring msg with ${$case}`)
        }
      }
    })

    ws.on('error', (error) => {
      logger.error(error)
      ws.close()
      const room = connectionsPerRoom.get(roomId)
      if (room) {
        room.delete(ws)
      }
    })

    ws.on('close', () => {
      logger.info('Websocket closed')
      const room = connectionsPerRoom.get(roomId)
      if (room) {
        room.delete(ws)
      }
    })
  })
}
