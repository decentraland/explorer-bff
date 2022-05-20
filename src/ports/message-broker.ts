import { IBaseComponent } from '@well-known-components/interfaces'
import { connect, NatsConnection } from 'nats'
import { Subscription, BaseComponents } from '../types'

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
  subscribe(topic: string): Subscription

  start(): Promise<void>
  stop(): Promise<void>
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

  function subscribe(topic: string): Subscription {
    const sub = natsConnection.subscribe(topic)
    sub.closed
      .then(() => {
        logger.log('subscription closed')
      })
      .catch((err) => {
        logger.error(`subscription closed with an error ${err.message}`)
      })
    return sub
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
    stop
  }
}
