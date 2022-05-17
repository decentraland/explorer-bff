import { upgradeWebSocketResponse } from '@well-known-components/http-server/dist/ws'
import { IHttpServerComponent } from '@well-known-components/interfaces'
import { WebSocket } from 'ws'
import { GlobalContext } from '../../types'
import * as proto from '../proto/broker'

const connections = new Set<WebSocket>()

const topicsPerConnection = new WeakMap<WebSocket, Set<string>>()
let connectionCounter = 0

const aliasToUserId = new Map<number, string>()

function getTopicList(socket: WebSocket): Set<string> {
  let set = topicsPerConnection.get(socket)
  if (!set) {
    set = new Set()
    topicsPerConnection.set(socket, set)
  }
  return set
}

export async function websocketHandler(context: IHttpServerComponent.DefaultContext<GlobalContext>) {
  const logger = context.components.logs.getLogger('Websocket Handler')
  logger.info('Websocket')

  return upgradeWebSocketResponse((socket) => {
    logger.info('Websocket connected')
    // TODO fix ws types
    const ws = socket as any as WebSocket

    connections.add(ws)

    const alias = ++connectionCounter

    const query = context.url.searchParams
    const userId = query.get('identity') as string
    aliasToUserId.set(alias, userId)

    connections.add(ws)

    ws.on('message', (message) => {
      const data = message as Buffer
      const msgType = proto.CoordinatorMessage.deserializeBinary(data).getType()

      if (msgType === proto.MessageType.PING) {
        ws.send(data)
      } else if (msgType === proto.MessageType.TOPIC) {
        const topicMessage = proto.TopicMessage.deserializeBinary(data)

        const topic = topicMessage.getTopic()

        const topicFwMessage = new proto.TopicFWMessage()
        topicFwMessage.setType(proto.MessageType.TOPIC_FW)
        topicFwMessage.setFromAlias(alias)
        topicFwMessage.setBody(topicMessage.getBody_asU8())

        const topicData = topicFwMessage.serializeBinary()

        // Reliable/unreliable data
        connections.forEach(($) => {
          if (ws !== $) {
            if (getTopicList($).has(topic)) {
              $.send(topicData)
            }
          }
        })
      } else if (msgType === proto.MessageType.TOPIC_IDENTITY) {
        const topicMessage = proto.TopicIdentityMessage.deserializeBinary(data)

        const topic = topicMessage.getTopic()

        const topicFwMessage = new proto.TopicIdentityFWMessage()
        topicFwMessage.setType(proto.MessageType.TOPIC_IDENTITY_FW)
        topicFwMessage.setFromAlias(alias)
        topicFwMessage.setIdentity(aliasToUserId.get(alias)!)
        topicFwMessage.setRole(proto.Role.CLIENT)
        topicFwMessage.setBody(topicMessage.getBody_asU8())

        const topicData = topicFwMessage.serializeBinary()

        // Reliable/unreliable data
        connections.forEach(($) => {
          if (ws !== $) {
            if (getTopicList($).has(topic)) {
              $.send(topicData)
            }
          }
        })
      } else if (msgType === proto.MessageType.SUBSCRIPTION) {
        const topicMessage = proto.SubscriptionMessage.deserializeBinary(data)
        const rawTopics = topicMessage.getTopics()
        const topics = Buffer.from(rawTopics as string).toString('utf8')
        const set = getTopicList(ws)
        logger.info('Subscription', { topics })

        set.clear()
        topics.split(/\s+/g).forEach(($) => set.add($))
      }
    })

    setTimeout(() => {
      try {
        const welcome = new proto.WelcomeMessage()
        welcome.setType(proto.MessageType.WELCOME)
        welcome.setAlias(alias)
        const data = welcome.serializeBinary()

        ws.send(data)
      } catch (err: any) {
        logger.error(err)
      }
    }, 100)

    ws.on('error', (error) => {
      logger.error(error)
      ws.close()
      connections.delete(ws)
    })

    ws.on('close', () => {
      logger.info('Websocket closed')
      connections.delete(ws)
    })
  })
}
