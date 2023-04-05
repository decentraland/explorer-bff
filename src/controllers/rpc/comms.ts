import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { pushableChannel } from '@well-known-components/pushable-channel'
import { NatsMsg } from '@well-known-components/nats-component/dist/types'
import { RpcContext, Channel, BaseComponents } from '../../types'
import { CommsServiceDefinition } from '@dcl/protocol/out-js/decentraland/bff/comms_service.gen'
import {
  PeerTopicSubscriptionResultElem,
  SystemTopicSubscriptionResultElem,
  TopicsServiceDefinition
} from '@dcl/protocol/out-js/decentraland/bff/topics_service.gen'

export const topicRegex = /^[^\.]+(\.[^\.]+)*$/

// the message topics for this service are prefixed to prevent
// users "hacking" the NATS messages
export const saltedPrefix = 'client-proto.'
export const peerPrefix = `${saltedPrefix}peer.`

const MAX_PEER_MESSAGES_BUFFER_SIZE = 50

function createChannelSubscription<T>(
  { logs, nats }: Pick<BaseComponents, 'logs' | 'nats'>,
  topic: string,
  transform: (m: NatsMsg) => T,
  maxBufferSize?: number
): Channel<T> {
  const logger = logs.getLogger(`ChannelSubscription`)
  const ch = pushableChannel<T>(() => {
    subscription.unsubscribe()
  })

  const subscription = nats.subscribe(topic, (err, message) => {
    if (err) {
      logger.error(err)
      ch.close()
      return
    }
    if (maxBufferSize && ch.bufferSize() > maxBufferSize) {
      logger.warn('Discarding messages because push channel buffer is full')
      return
    }
    ch.push(transform(message), (err?: any) => {
      if (err) {
        logger.error(err)
      }
    })
  })

  return ch
}

export async function onPeerConnected({ components, peer }: RpcContext) {
  if (!peer) {
    throw new Error('onPeerConnected for a non registered peer')
  }
  components.nats.publish(`peer.${peer.address}.connect`)
}

export async function onPeerDisconnected({ components, peer }: RpcContext) {
  if (!peer) {
    throw new Error('onPeerDisconnected for a non registered peer')
  }

  peer.peerSubscriptions.forEach((subscription) => {
    subscription.close()
  })

  peer.systemSubscriptions.forEach((subscription) => {
    subscription.close()
  })

  peer.peerSubscriptions.clear()
  peer.systemSubscriptions.clear()

  if (!components.rpcSessions.sessions.has(peer.address)) {
    components.nats.publish(`peer.${peer.address}.disconnect`)
  }
}

export const commsModule: RpcServerModule<CommsServiceDefinition, RpcContext> = {
  async publishToTopic({ topic, payload }, { peer, components }) {
    if (!peer) {
      throw new Error('Trying to publish from a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}${peer.address}.${topic}`
    components.nats.publish(realTopic, payload)
    return {
      ok: true
    }
  },
  async subscribeToPeerMessages({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}*.${topic}`
    const ch = createChannelSubscription<PeerTopicSubscriptionResultElem>(
      components,
      realTopic,
      (message) => {
        let topic = message.subject.substring(peerPrefix.length)
        const sender = topic.substring(0, topic.indexOf('.'))
        topic = topic.substring(sender.length + 1)
        return { payload: message.data, topic, sender }
      },
      MAX_PEER_MESSAGES_BUFFER_SIZE
    )

    const subscriptionId = peer.subscriptionsIndex
    peer.peerSubscriptions.set(subscriptionId, ch)
    peer.subscriptionsIndex++
    return { subscriptionId }
  },
  async subscribeToSystemMessages({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${saltedPrefix}${topic}`

    const ch = createChannelSubscription<SystemTopicSubscriptionResultElem>(components, realTopic, (message) => {
      const topic = message.subject.substring(saltedPrefix.length)
      return { payload: message.data, topic }
    })

    const subscriptionId = peer.subscriptionsIndex
    peer.systemSubscriptions.set(subscriptionId, ch)
    peer.subscriptionsIndex++

    return { subscriptionId }
  },
  async *getPeerMessages({ subscriptionId }, { peer, components }) {
    if (!peer) {
      throw new Error('Trying to get messages for a peer that has not been registered')
    }
    const subscription = peer.peerSubscriptions.get(subscriptionId)
    if (!subscription) {
      components.logs.getLogger('getPeerMessages').error('Subscription not found', { subscriptionId })
      return
    }

    for await (const message of subscription) {
      yield message
    }
  },
  async *getSystemMessages({ subscriptionId }, { peer, components }) {
    if (!peer) {
      throw new Error('Trying to get messages for a peer that has not been registered')
    }
    const subscription = peer.systemSubscriptions.get(subscriptionId)
    if (!subscription) {
      components.logs.getLogger('getSystemMessages').error('Subscription not found', { subscriptionId })
      return
    }

    for await (const message of subscription) {
      yield message
    }
  },
  async unsubscribeToPeerMessages({ subscriptionId }, { peer }) {
    if (!peer) {
      throw new Error('Trying to unsubscribe from a peer that has not been registered')
    }
    const subscription = peer.peerSubscriptions.get(subscriptionId)
    if (subscription) {
      subscription.close()
      peer.peerSubscriptions.delete(subscriptionId)
    }

    return { ok: true }
  },
  async unsubscribeToSystemMessages({ subscriptionId }, { peer }) {
    if (!peer) {
      throw new Error('Trying to unsubscribe from a peer that has not been registered')
    }
    const subscription = peer && peer.systemSubscriptions.get(subscriptionId)
    if (subscription) {
      subscription.close()
      peer.systemSubscriptions.delete(subscriptionId)
    }

    return { ok: true }
  }
}

export const topicsModule: RpcServerModule<TopicsServiceDefinition, RpcContext> = {
  async publishToTopic({ topic, payload }, { peer, components }) {
    if (!peer) {
      throw new Error('Trying to publish from a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}${peer.address}.${topic}`
    components.nats.publish(realTopic, payload)
    return {
      ok: true
    }
  },
  peerSubscription({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}*.${topic}`

    return createChannelSubscription<PeerTopicSubscriptionResultElem>(
      components,
      realTopic,
      (message) => {
        let topic = message.subject.substring(peerPrefix.length)
        const sender = topic.substring(0, topic.indexOf('.'))
        topic = topic.substring(sender.length + 1)
        return { payload: message.data, topic, sender }
      },
      MAX_PEER_MESSAGES_BUFFER_SIZE
    )
  },
  systemSubscription({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${saltedPrefix}${topic}`

    return createChannelSubscription<SystemTopicSubscriptionResultElem>(components, realTopic, (message) => {
      const topic = message.subject.substring(saltedPrefix.length)
      return { payload: message.data, topic }
    })
  }
}
