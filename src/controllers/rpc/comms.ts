import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { RpcContext } from '../../types'
import { CommsServiceDefinition } from '../bff-proto/comms-service'

export const topicRegex = /^[^\.]+(\.[^\.]+)*$/

// the message topics for this service are prefixed to prevent
// users "hacking" the NATS messages
export const saltedPrefix = 'client-proto.'
export const peerPrefix = `${saltedPrefix}peer.`

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
    subscription.unsubscribe()
  })

  peer.systemSubscriptions.forEach((subscription) => {
    subscription.unsubscribe()
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
    const subscription = components.nats.subscribe(realTopic)

    const subscriptionId = peer.subscriptionsIndex
    peer.peerSubscriptions.set(subscriptionId, subscription)
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
    const subscription = components.nats.subscribe(realTopic)

    const subscriptionId = peer.subscriptionsIndex
    peer.systemSubscriptions.set(subscriptionId, subscription)
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

    for await (const message of subscription.generator) {
      let topic = message.subject.substring(peerPrefix.length)
      const sender = topic.substring(0, topic.indexOf('.'))
      topic = topic.substring(sender.length + 1)
      yield { payload: message.data, topic, sender }
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

    for await (const message of subscription.generator) {
      const topic = message.subject.substring(saltedPrefix.length)
      yield { payload: message.data, topic }
    }
  },
  async unsubscribeToPeerMessages({ subscriptionId }, { peer }) {
    if (!peer) {
      throw new Error('Trying to unsubscribe from a peer that has not been registered')
    }
    const subscription = peer.peerSubscriptions.get(subscriptionId)

    if (subscription) {
      subscription.unsubscribe()
    }

    return { ok: true }
  },
  async unsubscribeToSystemMessages({ subscriptionId }, { peer }) {
    if (!peer) {
      throw new Error('Trying to unsubscribe from a peer that has not been registered')
    }
    const subscription = peer && peer.systemSubscriptions.get(subscriptionId)

    if (subscription) {
      subscription.unsubscribe()
    }

    return { ok: true }
  }
}
