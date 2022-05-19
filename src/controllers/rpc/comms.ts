import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { RpcContext } from '../../types'
import { CommsServiceDefinition } from '../bff-proto/comms-service'

// the message topics for this service are prefixed to prevent
// users "hacking" the NATS messages
const saltedPrefix = 'client-proto.'

export const commsModule: RpcServerModule<CommsServiceDefinition, RpcContext> = {
  async publishToTopic(topicMessage, context) {
    const realTopic = saltTopic(topicMessage.topic)
    context.components.messageBroker.publish(realTopic, topicMessage.payload)
    return {
      ok: true
    }
  },
  async *subscribeToTopic(subscription, context) {
    const realTopic = saltTopic(subscription.topic)
    for await (const message of context.components.messageBroker.subscribeGenerator(realTopic)) {
      yield { payload: message.data, topic: unsaltTopic(message.subject), sender: '0x0' }
    }
  }
}

// adds a prefix
export function saltTopic(topic: string) {
  return saltedPrefix + topic
}

// removes a prefix
export function unsaltTopic(topic: string) {
  if (topic.startsWith(saltedPrefix)) {
    return topic.substring(saltedPrefix.length)
  }
  return topic
}
