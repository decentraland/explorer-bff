import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { pushableChannel } from '@well-known-components/pushable-channel'
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

const MAX_PEER_MESSAGES_BUFFER_SIZE = 50

type PeerChannel = Channel<PeerTopicSubscriptionResultElem>
const localSubcriptions = new Map<string, Set<PeerChannel>>()

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
  async publishToTopic({ topic, payload }, { peer, components: { logs, nats } }) {
    if (!peer) {
      throw new Error('Trying to publish from a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const logger = logs.getLogger(`publishing to ${topic}`)

    // TODO: check this
    if (topic.includes('heartbeat')) {
      const realTopic = `${peerPrefix}${peer.address}.${topic}`
      nats.publish(realTopic, payload)
    } else {
      const chs = localSubcriptions.get(topic)
      if (chs) {
        chs.forEach((ch) => {
          ch.push({ payload, topic, sender: peer.address }, (err?: any) => {
            if (err) {
              logger.error(err)
            }
          })
        })
      }
    }

    return {
      ok: true
    }
  },
  async subscribeToPeerMessages({ topic }, { components: { logs, nats }, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const logger = logs.getLogger(`peer subscription-${topic}`)
    const ch = pushableChannel<PeerTopicSubscriptionResultElem>(() => {
      const chs = localSubcriptions.get(topic)
      if (chs) {
        chs.delete(ch)
        if (chs.size === 0) {
          localSubcriptions.delete(topic)
        }
      }
      subscription.unsubscribe()
    })

    const subscription = nats.subscribe(`${peerPrefix}*.${topic}`, (err, message) => {
      if (err) {
        logger.error(err)
        ch.close()
        return
      }
      if (ch.bufferSize() > MAX_PEER_MESSAGES_BUFFER_SIZE) {
        logger.warn('Discarding messages because push channel buffer is full')
        return
      }
      let topic = message.subject.substring(peerPrefix.length)
      const sender = topic.substring(0, topic.indexOf('.'))
      topic = topic.substring(sender.length + 1)
      ch.push({ payload: message.data, topic, sender }, (err?: any) => {
        if (err) {
          logger.error(err)
        }
      })
    })

    const l = localSubcriptions.get(topic) || new Set<PeerChannel>()
    l.add(ch)
    localSubcriptions.set(topic, l)

    const subscriptionId = peer.subscriptionsIndex
    peer.peerSubscriptions.set(subscriptionId, ch)
    peer.subscriptionsIndex++
    return { subscriptionId }
  },
  async subscribeToSystemMessages({ topic }, { components: { logs, nats }, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const logger = logs.getLogger(`system subscription-${topic}`)

    const ch = pushableChannel<SystemTopicSubscriptionResultElem>(() => {
      subscription.unsubscribe()
    })

    const subscription = nats.subscribe(`${saltedPrefix}${topic}`, (err, message) => {
      if (err) {
        logger.error(err)
        ch.close()
        return
      }

      const topic = message.subject.substring(saltedPrefix.length)
      ch.push({ payload: message.data, topic }, (err?: any) => {
        if (err) {
          logger.error(err)
        }
      })
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
