import { IBaseComponent } from '@well-known-components/interfaces'
import { IMessageBrokerComponent, MessageBrokerEvents } from '../../src/ports/message-broker'
import { BaseComponents, NatsMsg, Subscription } from '../../src/types'
import { pushableChannel } from '@dcl/rpc/dist/push-channel'
import mitt from 'mitt'
import { Emitter } from 'mitt'

type PushableChannel = {
  push(msg: NatsMsg): void
}

export async function createLocalMessageBrokerComponent(
  _: Pick<BaseComponents, 'config' | 'logs'>
): Promise<IMessageBrokerComponent & IBaseComponent> {
  const channels = new Map<string, PushableChannel>()
  const events = mitt<MessageBrokerEvents>()

  function publish(topic: string, data: Uint8Array): void {
    channels.forEach((ch, pattern) => {
      const sPattern = pattern.split('.')
      const sTopic = topic.split('.')

      if (sPattern.length !== sTopic.length) {
        return
      }

      for (let i = 0; i < sTopic.length; i++) {
        if (sPattern[i] !== '*' && sPattern[i] !== sTopic[i]) {
          return
        }
      }

      ch.push({ subject: topic, data })
    })
  }

  function subscribe(pattern: string): Subscription {
    const channel = pushableChannel<NatsMsg>(function deferCloseChannel() {
      channels.delete(pattern)
    })
    channels.set(pattern, channel)
    return {
      unsubscribe: () => channel.close(),
      generator: channel.iterable
    }
  }

  async function start() {
    events.emit('connected')
  }

  async function stop() {}

  return {
    publish,
    subscribe,
    start,
    stop,
    events
  }
}
