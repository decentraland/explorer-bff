import { IBaseComponent, IConfigComponent, ILoggerComponent } from "@well-known-components/interfaces"
import { connect, JSONCodec, StringCodec, NatsConnection, Subscription } from "nats"
import { BaseComponents } from "../types"

export declare type IMessageBrokerComponent = {
  publish(subject: string, message: any): void
  subscribe(subject: string, handler: Function): Subscription

  start(): Promise<void>
  stop(): Promise<void>
}

export async function createMessageBrokerComponent(
  components: Pick<BaseComponents, "config" | "logs">
): Promise<IMessageBrokerComponent & IBaseComponent> {
  const { config, logs } = components
  const logger = logs.getLogger("MessageBroker")
  const jsonCodec = JSONCodec()
  const stringCodec = StringCodec()

  // config
  const natsUrl = (await config.getString("NATS_URL")) || "nats.decentraland.zone:4222"
  const natsConfig = { servers: `${natsUrl}` }
  let natsConnection: NatsConnection

  function publish(subject: string, message: any): void {
    if (message instanceof Uint8Array) {
      natsConnection.publish(subject, message)
    } else if (typeof message === "object") {
      natsConnection.publish(subject, jsonCodec.encode(message))
    } else if (typeof message === "string") {
      natsConnection.publish(subject, stringCodec.encode(message))
    } else {
      logger.error(`Invalid message: ${JSON.stringify(message)}`)
    }
  }

  function subscribe(subject: string, handler: Function): Subscription {
    const subscription = natsConnection.subscribe(subject)
    ;(async () => {
      for await (const message of subscription) {
        try {
          if (message.data.length) {
            const data = message.data
            const payload = await handler(data)
          } else {
            const payload = await handler()
          }
        } catch (err: any) {
          logger.error(err)
        }
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
