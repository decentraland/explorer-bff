import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { RpcContext, Subscription } from '../../types'
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
  components.messageBroker.publish(`peer.${peer.address}.connect`)
}

export async function onPeerDisconnected({ components, peer }: RpcContext) {
  if (!peer) {
    throw new Error('onPeerDisconnected for a non registered peer')
  }

  peer.systemSubscriptions.forEach((subscription) => {
    subscription.unsubscribe()
  })

  peer.peerSubscriptions.forEach((subscription) => {
    subscription.unsubscribe()
  })

  components.messageBroker.publish(`peer.${peer.address}.disconnect`)
}

export const commsModule: RpcServerModule<CommsServiceDefinition, RpcContext> = {
  async publishToTopic({ topic, payload }, { peer, components }) {
    if (!peer) {
      throw new Error('trying to publish from a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}${peer.address}.${topic}`
    components.messageBroker.publish(realTopic, payload)
    return {
      ok: true
    }
  },
  async subscribe({ topic, fromPeers }, { components, peer }) {
    if (!peer) {
      throw new Error('trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    let subscriptions: Map<number, Subscription>
    let realTopic: string
    if (fromPeers) {
      realTopic = `${peerPrefix}*.${topic}`
      subscriptions = peer.peerSubscriptions
    } else {
      realTopic = `${saltedPrefix}${topic}`
      subscriptions = peer.systemSubscriptions
    }
    const subscription = components.messageBroker.subscribe(realTopic)

    peer.subscriptionsIndex++
    const subscriptionId = peer.subscriptionsIndex
    subscriptions.set(subscriptionId, subscription)

    return { id: subscriptionId }
  },
  async *getSystemMessages({ id }, { peer }) {
    if (!peer) {
      throw new Error('trying to subscribe a peer that has not been registered')
    }

    const subscription = peer.systemSubscriptions.get(id)
    if (!subscription) {
      throw new Error(`No subscription with id ${id}`)
    }

    for await (const message of subscription.generator()) {
      yield { payload: message.data, topic: message.subject.substring(saltedPrefix.length) }
    }
  },
  async *getPeerMessages({ id }, { peer }) {
    if (!peer) {
      throw new Error('trying to subscribe a peer that has not been registered')
    }

    const subscription = peer.peerSubscriptions.get(id)
    if (!subscription) {
      throw new Error(`No subscription with id ${id}`)
    }

    for await (const message of subscription.generator()) {
      let topic = message.subject.substring(peerPrefix.length)
      const sender = topic.substring(0, topic.indexOf('.'))
      topic = topic.substring(sender.length + 1)
      yield { payload: message.data, topic, sender }
    }
  },
  async unsubscribe({ id, fromPeers }, { peer }) {
    if (!peer) {
      throw new Error('trying to unsubscribe a peer that has not been registered')
    }

    const subscription = fromPeers ? peer.peerSubscriptions.get(id) : peer.systemSubscriptions.get(id)

    if (subscription) {
      subscription.unsubscribe()
    }
    return {
      ok: true
    }
  }
}
