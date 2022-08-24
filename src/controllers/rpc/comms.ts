import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { pushableChannel } from '@dcl/rpc/dist/push-channel'
import { NatsMsg } from '@well-known-components/nats-component/dist/types'
import { RpcContext, Channel, BaseComponents } from '../../types'
import {
  CommsServiceDefinition,
  PeerTopicSubscriptionResultElem,
  SystemTopicSubscriptionResultElem
} from '../bff-proto/comms-service'

export const topicRegex = /^[^\.]+(\.[^\.]+)*$/

// the message topics for this service are prefixed to prevent
// users "hacking" the NATS messages
export const saltedPrefix = 'client-proto.'
export const peerPrefix = `${saltedPrefix}peer.`

function createChannelSubscription<T>(
  { logs, nats }: Pick<BaseComponents, 'logs' | 'nats'>,
  topic: string,
  transform: (m: NatsMsg) => T
): Channel<T> {
  const subscription = nats.subscribe(topic)
  const logger = logs.getLogger(`channel subscription-${topic}`)
  const ch = pushableChannel<T>(() => {
    subscription.unsubscribe()
  })

  async function run() {
    for await (const message of subscription.generator) {
      ch.push(transform(message), (err?: any) => {
        if (err) {
          logger.debug(err)
        }
      })
    }
  }

  run().catch((err) => {
    logger.error(err)
  })

  return ch
}

export async function onPeerConnected({ components, peer }: RpcContext) {
  if (!peer) {
    throw new Error('onPeerConnected for a non registered peer')
  }
  components.nats.publish(`peer.${peer.address}.connect`)
  components.metrics.increment('explorer_bff_connected_users', {})
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

  components.nats.publish(`peer.${peer.address}.disconnect`)
  components.metrics.decrement('explorer_bff_connected_users', {})
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
    const ch = createChannelSubscription<PeerTopicSubscriptionResultElem>(components, realTopic, (message) => {
      let topic = message.subject.substring(peerPrefix.length)
      const sender = topic.substring(0, topic.indexOf('.'))
      topic = topic.substring(sender.length + 1)
      return { payload: message.data, topic, sender }
    })

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
  async *getPeerMessages({ subscriptionId }, { peer }) {
    if (!peer) {
      throw new Error('Trying to get messages for a peer that has not been registered')
    }
    const subscription = peer.peerSubscriptions.get(subscriptionId)
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`)
    }

    for await (const message of subscription) {
      yield message
    }
  },
  async *getSystemMessages({ subscriptionId }, { peer }) {
    if (!peer) {
      throw new Error('Trying to get messages for a peer that has not been registered')
    }
    const subscription = peer.systemSubscriptions.get(subscriptionId)
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`)
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
    }

    return { ok: true }
  }
}
