import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { RpcContext, Subscription } from '../../types'
import { CommsServiceDefinition } from '../bff-proto/comms-service'

// the message topics for this service are prefixed to prevent
// users "hacking" the NATS messages
const saltedPrefix = 'client-proto.'

export const commsModule: RpcServerModule<CommsServiceDefinition, RpcContext> = {
  async publishToTopic({ topic, payload }, { peer, components }) {
    if (!peer) {
      throw new Error('trying to publish from a peer that has not been registered')
    }

    const realTopic = saltTopic(`${peer.address}.${topic}`)
    components.messageBroker.publish(realTopic, payload)
    return {
      ok: true
    }
  },
  async *subscribeToTopic({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('trying to subscribe a peer that has not been registered')
    }

    const realTopic = saltTopic(topic)

    const subscription = components.messageBroker.subscribe(realTopic)

    if (!peer.subscriptions) {
      peer.subscriptions = new Map<string, Subscription>()
    }
    peer.subscriptions.set(realTopic, subscription)

    for await (const message of subscription) {
      yield { payload: message.data, topic: unsaltTopic(message.subject), sender: '0x0' }
    }
  },
  async unsubscribeToTopic({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('trying to unsubscribe a peer that has not been registered')
    }

    const realTopic = saltTopic(topic)
    const subscription = peer.subscriptions && peer.subscriptions.get(realTopic)
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
