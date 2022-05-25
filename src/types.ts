import type { IFetchComponent, WebSocketServer } from '@well-known-components/http-server'
import type {
  IConfigComponent,
  ILoggerComponent,
  IHttpServerComponent,
  IBaseComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'
import { metricDeclarations } from './metrics'
import { IMessageBrokerComponent } from './ports/message-broker'
import { WebSocket } from 'ws'
import { HttpProvider } from 'web3x/providers'
import { RpcServer, RpcServerPort } from '@dcl/rpc'
import { Emitter } from 'mitt'
import { Msg } from 'nats'

export type GlobalContext = {
  components: BaseComponents
}

export type RpcContext = GlobalContext & { peer?: RpcSession }

export type WebSocketComponent = IBaseComponent & {
  ws: WebSocketServer
}

// components used in every environment
export type BaseComponents = {
  config: IConfigComponent
  logs: ILoggerComponent
  server: IHttpServerComponent<GlobalContext>
  fetch: IFetchComponent
  metrics: IMetricsComponent<keyof typeof metricDeclarations>
  ws: WebSocketComponent
  messageBroker: IMessageBrokerComponent
  // TODO: deprecate web3x and use ethersjs
  ethereumProvider: HttpProvider

  rpcServer: RpcServer<RpcContext>
  roomsMessages: Emitter<Record<string /* roomId */, RoomMessage>>

  rpcSessions: {
    sessions: Map<string, RpcSession>
  }
}

export type RoomMessage = {
  room: string
  sender: string
  payload: Uint8Array
}

export interface Subscription extends AsyncIterable<Msg> {
  unsubscribe(): void
}

export type RpcSession = {
  port: RpcServerPort<RpcContext>
  address: string
  peerSubscriptions: Map<number, Subscription>
  systemSubscriptions: Map<number, Subscription>
  subscriptionsIndex: number
}

// components used in runtime
export type AppComponents = BaseComponents & {
  statusChecks: IBaseComponent
}

// components used in tests
export type TestComponents = BaseComponents & {
  // A fetch component that only hits the test server
  localFetch: IFetchComponent
  createLocalWebSocket: IWsTestComponent
}

export type IWsTestComponent = {
  createWs(relativeUrl: string): WebSocket
}

// this type simplifies the typings of http handlers
export type HandlerContextWithPath<
  ComponentNames extends keyof AppComponents,
  Path extends string = any
> = IHttpServerComponent.PathAwareContext<
  IHttpServerComponent.DefaultContext<{
    components: Pick<AppComponents, ComponentNames>
  }>,
  Path
>

export type Context<Path extends string = any> = IHttpServerComponent.PathAwareContext<GlobalContext, Path>
