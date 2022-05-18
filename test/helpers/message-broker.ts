import { IBaseComponent } from '@well-known-components/interfaces'
import { StreamMessage, Subscription } from '../../src/ports/message-broker'
import { IMessageBrokerComponent } from '../../src/ports/message-broker'
import { BaseComponents } from '../../src/types'
import mitt from 'mitt'
import { pushableChannel } from '@dcl/rpc/dist/push-channel'

export async function createLocalMessageBrokerComponent(
  components: Pick<BaseComponents, 'config' | 'logs'>
): Promise<IMessageBrokerComponent & IBaseComponent> {
  const messages = mitt<Record<string, Uint8Array>>()

  function matchesNatsWildcards(pattern: string, topic: string) {
    // TODO: match topic.*.b with topic.test.b like nats does
    return pattern == topic
  }

  function publish(topic: string, message: Uint8Array): void {
    messages.emit(topic, message)
  }

  function subscribe(topic: string, handler: Function): Subscription {
    const unsubscribe = () => {}
    return { unsubscribe }
  }

  async function* subscribeGenerator(pattern: string): AsyncGenerator<StreamMessage> {
    const channel = pushableChannel<Uint8Array>(() => deferCloseChannel)
    const send = (topic: string, payload: Uint8Array) => {
      if (matchesNatsWildcards(pattern, topic)) {
        channel.push(payload)
      }
    }
    function deferCloseChannel() {
      messages.off('*', send)
    }
    messages.on('*', send)

    // forward all messages
    for await (const message of channel) {
      yield {
        data: message,
        subject: pattern
      }
    }

    channel.close()
  }

  async function start() {}

  async function stop() {}

  return {
    publish,
    subscribe,
    subscribeGenerator,
    start,
    stop
  }
}
