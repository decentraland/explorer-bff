import type { IFetchComponent, WebSocketServer } from '@well-known-components/http-server'
import type {
  IConfigComponent,
  ILoggerComponent,
  IHttpServerComponent,
  IBaseComponent,
  IMetricsComponent
} from '@well-known-components/interfaces'
import { metricDeclarations } from './metrics'
import { INatsComponent } from '@well-known-components/nats-component/dist/types'
import { WebSocket } from 'ws'
import { RpcServer, RpcServerPort } from '@dcl/rpc'
import { IServiceDiscoveryComponent } from './ports/service-discovery'
import { IRealmComponent } from './ports/realm'
import { CatalystContract } from '@dcl/catalyst-contracts'
import { IStatusComponent } from './ports/status'

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
  nats: INatsComponent
  serviceDiscovery: IServiceDiscoveryComponent
  realm: IRealmComponent
  ethereumProvider: any
  contract: CatalystContract
  status: IStatusComponent

  rpcServer: RpcServer<RpcContext>

  rpcSessions: {
    sessions: Map<string, RpcSession>
  }
}

export type NatsMsg = {
  subject: string
  data: Uint8Array
}

export type Subscription = {
  generator: AsyncIterable<NatsMsg>
  unsubscribe: () => void
}

export type RpcSession = {
  port: RpcServerPort<RpcContext>
  address: string
  subscriptionsIndex: number
  peerSubscriptions: Map<number, Subscription>
  systemSubscriptions: Map<number, Subscription>
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
