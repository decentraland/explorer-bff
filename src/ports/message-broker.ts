import { IBaseComponent } from '@well-known-components/interfaces'
import { connect, NatsConnection } from 'nats'
import { BaseComponents } from '../types'

export type Message = {
  data: Uint8Array
  topic: Topic
}

export type StreamMessage = {
  data: Uint8Array
  subject: string
}

class Topic {
  constructor(private readonly topic: string) {}
  getLevel(level: number): string {
    return this.topic.split('.')[level]
  }

  getFullTopic(): string {
    return this.topic
  }
}

export type IMessageBrokerComponent = {
  publish(topic: string, message?: Uint8Array): void
  subscribe(topic: string, handler: (message: Message) => Promise<void> | void): Subscription

  subscribeGenerator(topic: string): AsyncGenerator<StreamMessage>

  start(): Promise<void>
  stop(): Promise<void>
}

export interface Subscription {
  unsubscribe(): void
}

export async function createMessageBrokerComponent(
  components: Pick<BaseComponents, 'config' | 'logs'>
): Promise<IMessageBrokerComponent & IBaseComponent> {
  const { config, logs } = components
  const logger = logs.getLogger('MessageBroker')

  // config
  const natsUrl = await config.getString('NATS_URL')
  const natsConfig = { servers: `${natsUrl}` }
  let natsConnection: NatsConnection

  function publish(topic: string, message?: Uint8Array): void {
    natsConnection.publish(topic, message)
  }

  function subscribe(topic: string, handler: (_: Message) => Promise<void>): Subscription {
    const subscription = natsConnection.subscribe(topic)
    ;(async () => {
      for await (const message of subscription) {
        await handler({ data: message.data, topic: new Topic(message.subject) })
      }
    })().catch((err: any) => logger.error(`error processing subscription message; ${err.toString()}`))
    return subscription
  }

  async function* subscribeGenerator(topic: string): AsyncGenerator<StreamMessage> {
    // TODO: test that closing the stream actually closes the subscription
    for await (const message of natsConnection.subscribe(topic)) {
      yield { data: message.data, subject: message.subject }
    }
  }

  async function start() {
    try {
      natsConnection = await connect(natsConfig)
      logger.info(`Connected to NATS: ${natsUrl}`)
    } catch (error) {
      logger.error(`An error occurred trying to connect to the NATS server: ${natsUrl}`)
      throw error
    }
  }

  async function stop() {
    try {
      await natsConnection.close()
    } catch (error) {
      logger.error(`An error occurred trying to close the connection to the NATS server: ${natsUrl}`)
    }
  }

  return {
    publish,
    subscribe,
    start,
    stop,
    subscribeGenerator
  }
}
