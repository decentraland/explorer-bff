import { IBaseComponent, IConfigComponent } from "@well-known-components/interfaces"
import { Subscription } from "../../src/ports/message-broker"
import { IMessageBrokerComponent } from "../../src/ports/message-broker"
import { BaseComponents } from "../../src/types"

export async function createLocalMessageBrokerComponent(
  components: Pick<BaseComponents, "config" | "logs">
): Promise<IMessageBrokerComponent & IBaseComponent> {
  function publish(topic: string, message: any): void {}

  function subscribe(topic: string, handler: Function): Subscription {
    const unsubscribe = () => {}
    return { unsubscribe }
  }

  async function start() {}

  async function stop() {}

  return {
    publish,
    subscribe,
    start,
    stop,
  }
}
