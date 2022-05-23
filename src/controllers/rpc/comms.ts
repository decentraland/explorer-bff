import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { RpcContext, Subscription } from '../../types'
import { CommsServiceDefinition } from '../bff-proto/comms-service'

const topicRegex = /^[^\.]+(\.[^\.]+)*$/

// the message topics for this service are prefixed to prevent
// users "hacking" the NATS messages
const saltedPrefix = 'client-proto.'
const peerPrefix = `${saltedPrefix}peer.`

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
  async *subscribeToPeerTopic({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}*.${topic}`
    const subscription = components.messageBroker.subscribe(realTopic)

    const subscriptions = peer.subscriptions ?? new Map<string, Subscription>()
    subscriptions.set(topic, subscription)
    peer.subscriptions = subscriptions

    for await (const message of subscription) {
      let topic = message.subject.substring(peerPrefix.length)
      const sender = topic.substring(0, topic.indexOf('.'))
      topic = topic.substring(sender.length + 1)

      yield { payload: message.data, topic, sender }
    }
  },
  async *subscribeToSystemTopic({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = saltTopic(topic)
    const subscription = components.messageBroker.subscribe(realTopic)

    const subscriptions = peer.subscriptions ?? new Map<string, Subscription>()
    subscriptions.set(topic, subscription)
    peer.subscriptions = subscriptions

    for await (const message of subscription) {
      yield { payload: message.data, topic: topic.substring(saltedPrefix.length) }
    }
  },
  async unsubscribeToTopic({ topic }, { peer }) {
    if (!peer) {
      throw new Error('trying to unsubscribe a peer that has not been registered')
    }

    const subscription = peer.subscriptions && peer.subscriptions.get(topic)
    if (subscription) {
      subscription.unsubscribe()
    }
    return {
      ok: true
    }
  }
}

// adds a prefix
export function saltTopic(topic: string) {
  return saltedPrefix + topic
}

// // removes a prefix
export function unsaltTopic(topic: string) {
  if (topic.startsWith(saltedPrefix)) {
    return topic.substring(saltedPrefix.length)
  }
  return topic
}
