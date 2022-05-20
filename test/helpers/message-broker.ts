import { IBaseComponent } from '@well-known-components/interfaces'
import { StreamMessage } from '../../src/ports/message-broker'
import { IMessageBrokerComponent } from '../../src/ports/message-broker'
import { BaseComponents, Subscription } from '../../src/types'
import mitt from 'mitt'

export async function createLocalMessageBrokerComponent(
  components: Pick<BaseComponents, 'config' | 'logs'>
): Promise<IMessageBrokerComponent & IBaseComponent> {
  const messages = mitt<Record<string, Uint8Array>>()

  function publish(topic: string, message: Uint8Array): void {
    messages.emit(topic, message)
  }

  function subscribe(_: string): Subscription {
    const unsubscribe = () => {}
    return { unsubscribe }
  }

  async function start() {}

  async function stop() {}

  return {
    publish,
    subscribe,
    start,
    stop
  }
}
