import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { RpcContext } from '../../types'
import { CommsServiceDefinition } from '../bff-proto/comms-service'

export const commsModule: RpcServerModule<CommsServiceDefinition, RpcContext> = {
  async publishToTopic(topicMessage, context) {
    context.components.messageBroker.publish(topicMessage.topic, topicMessage.payload)
    return {
      ok: true
    }
  },
  async *subscribeToTopic(subscription, context) {
    for await (const message of context.components.messageBroker.subscribeGenerator(subscription.topic)) {
      yield { payload: message.data, topic: message.subject, sender: '0x0' }
    }
  }
}
