import { IBaseComponent } from "@well-known-components/interfaces"
import { connect, NatsConnection } from "nats"
import { BaseComponents } from "../types"

export type Message = {
  data: Uint8Array
  topic: Topic
}

class Topic {
  constructor(private readonly topic: string) {}
  getLevel(level: number): string {
    return this.topic.split(".")[level]
  }
}

export type IMessageBrokerComponent = {
  publish(topic: string, message?: Uint8Array): void
  subscribe(topic: string, handler: (message: Message) => Promise<void> | void): Subscription

  start(): Promise<void>
  stop(): Promise<void>
}

export interface Subscription {
  unsubscribe(): void
}

export async function createMessageBrokerComponent(
  components: Pick<BaseComponents, "config" | "logs">
): Promise<IMessageBrokerComponent & IBaseComponent> {
  const { config, logs } = components
  const logger = logs.getLogger("MessageBroker")

  // config
  const natsUrl = (await config.getString("NATS_URL")) || "nats.decentraland.zone:4222"
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
    })()
    return subscription
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
  }
}
