import { RpcServerModule } from '@dcl/rpc/dist/codegen'
import { pushableChannel } from '@well-known-components/pushable-channel'
import { NatsMsg } from '@well-known-components/nats-component/dist/types'
import { RpcContext, Channel, BaseComponents } from '../../types'
import { CommsServiceDefinition } from '../../protocol/decentraland/bff/comms_service'
import {
  PeerTopicSubscriptionResultElem,
  SystemTopicSubscriptionResultElem,
  TopicsServiceDefinition
} from '../../protocol/decentraland/bff/topics_service'
import {
  PeerRoute,
  PeerRoutingTable,
  PeerStatus,
  RoutingServiceDefinition
} from '../../protocol/decentraland/bff/routing_service'
import { ServerStreamingMethodResult } from '@dcl/rpc/dist/codegen-types'
import { Empty } from '../../protocol/google/protobuf/empty'
import { isContext } from 'vm'

export const topicRegex = /^[^\.]+(\.[^\.]+)*$/

// the message topics for this service are prefixed to prevent
// users "hacking" the NATS messages
export const saltedPrefix = 'client-proto.'
export const peerPrefix = `${saltedPrefix}peer.`

const MAX_PEER_MESSAGES_BUFFER_SIZE = 50

function createChannelSubscription<T>(
  { logs, nats }: Pick<BaseComponents, 'logs' | 'nats'>,
  topic: string,
  transform: (m: NatsMsg) => T,
  maxBufferSize?: number
): Channel<T> {
  const logger = logs.getLogger(`ChannelSubscription`)
  const ch = pushableChannel<T>(() => {
    subscription.unsubscribe()
  })

  const subscription = nats.subscribe(topic, (err, message) => {
    if (err) {
      logger.error(err)
      ch.close()
      return
    }
    if (maxBufferSize && ch.bufferSize() > maxBufferSize) {
      logger.warn('Discarding messages because push channel buffer is full')
      return
    }
    ch.push(transform(message), (err?: any) => {
      if (err) {
        logger.error(err)
      }
    })
  })

  return ch
}

export async function onPeerConnected({ components, peer }: RpcContext) {
  if (!peer) {
    throw new Error('onPeerConnected for a non registered peer')
  }
  components.nats.publish(`peer.${peer.address}.connect`)
  components.metrics.increment('explorer_bff_connected_users', {})
}

export async function onPeerDisconnected({ components, peer }: RpcContext) {
  if (!peer) {
    throw new Error('onPeerDisconnected for a non registered peer')
  }

  peer.peerSubscriptions.forEach((subscription) => {
    subscription.close()
  })

  peer.systemSubscriptions.forEach((subscription) => {
    subscription.close()
  })

  peer.peerSubscriptions.clear()
  peer.systemSubscriptions.clear()

  components.nats.publish(`peer.${peer.address}.disconnect`)
  components.metrics.decrement('explorer_bff_connected_users', {})
}

export const commsModule: RpcServerModule<CommsServiceDefinition, RpcContext> = {
  async publishToTopic({ topic, payload }, { peer, components }) {
    if (!peer) {
      throw new Error('Trying to publish from a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}${peer.address}.${topic}`
    components.nats.publish(realTopic, payload)
    return {
      ok: true
    }
  },
  async subscribeToPeerMessages({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}*.${topic}`
    const ch = createChannelSubscription<PeerTopicSubscriptionResultElem>(
      components,
      realTopic,
      (message) => {
        let topic = message.subject.substring(peerPrefix.length)
        const sender = topic.substring(0, topic.indexOf('.'))
        topic = topic.substring(sender.length + 1)
        return { payload: message.data, topic, sender }
      },
      MAX_PEER_MESSAGES_BUFFER_SIZE
    )

    const subscriptionId = peer.subscriptionsIndex
    peer.peerSubscriptions.set(subscriptionId, ch)
    peer.subscriptionsIndex++
    return { subscriptionId }
  },
  async subscribeToSystemMessages({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${saltedPrefix}${topic}`

    const ch = createChannelSubscription<SystemTopicSubscriptionResultElem>(components, realTopic, (message) => {
      const topic = message.subject.substring(saltedPrefix.length)
      return { payload: message.data, topic }
    })

    const subscriptionId = peer.subscriptionsIndex
    peer.systemSubscriptions.set(subscriptionId, ch)
    peer.subscriptionsIndex++

    return { subscriptionId }
  },
  async *getPeerMessages({ subscriptionId }, { peer, components }) {
    if (!peer) {
      throw new Error('Trying to get messages for a peer that has not been registered')
    }
    const subscription = peer.peerSubscriptions.get(subscriptionId)
    if (!subscription) {
      components.logs.getLogger('getPeerMessages').error('Subscription not found', { subscriptionId })
      return
    }

    for await (const message of subscription) {
      yield message
    }
  },
  async *getSystemMessages({ subscriptionId }, { peer, components }) {
    if (!peer) {
      throw new Error('Trying to get messages for a peer that has not been registered')
    }
    const subscription = peer.systemSubscriptions.get(subscriptionId)
    if (!subscription) {
      components.logs.getLogger('getSystemMessages').error('Subscription not found', { subscriptionId })
      return
    }

    for await (const message of subscription) {
      yield message
    }
  },
  async unsubscribeToPeerMessages({ subscriptionId }, { peer }) {
    if (!peer) {
      throw new Error('Trying to unsubscribe from a peer that has not been registered')
    }
    const subscription = peer.peerSubscriptions.get(subscriptionId)
    if (subscription) {
      subscription.close()
      peer.peerSubscriptions.delete(subscriptionId)
    }

    return { ok: true }
  },
  async unsubscribeToSystemMessages({ subscriptionId }, { peer }) {
    if (!peer) {
      throw new Error('Trying to unsubscribe from a peer that has not been registered')
    }
    const subscription = peer && peer.systemSubscriptions.get(subscriptionId)
    if (subscription) {
      subscription.close()
      peer.systemSubscriptions.delete(subscriptionId)
    }

    return { ok: true }
  }
}

export const topicsModule: RpcServerModule<TopicsServiceDefinition, RpcContext> = {
  async publishToTopic({ topic, payload }, { peer, components }) {
    if (!peer) {
      throw new Error('Trying to publish from a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}${peer.address}.${topic}`
    components.nats.publish(realTopic, payload)
    return {
      ok: true
    }
  },
  peerSubscription({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${peerPrefix}*.${topic}`

    return createChannelSubscription<PeerTopicSubscriptionResultElem>(
      components,
      realTopic,
      (message) => {
        let topic = message.subject.substring(peerPrefix.length)
        const sender = topic.substring(0, topic.indexOf('.'))
        topic = topic.substring(sender.length + 1)
        return { payload: message.data, topic, sender }
      },
      MAX_PEER_MESSAGES_BUFFER_SIZE
    )
  },
  systemSubscription({ topic }, { components, peer }) {
    if (!peer) {
      throw new Error('Trying to subscribe a peer that has not been registered')
    }

    if (!topicRegex.test(topic)) {
      throw new Error(`Invalid topic ${topic}`)
    }

    const realTopic = `${saltedPrefix}${topic}`

    return createChannelSubscription<SystemTopicSubscriptionResultElem>(components, realTopic, (message) => {
      const topic = message.subject.substring(saltedPrefix.length)
      return { payload: message.data, topic }
    })
  }
}

type Route = string[] | 'server'
type PeerRoutingTableHugo = Map<string, Route>
type Mesh = Map<string, Set<string>>
type Island = string

/*  Example
 *  a <-> b
 *  a <-> c
 *
 *  Mesh = {
 *    a: [b, c],
 *    b: [a],
 *    c: [a]
 *  }
 */

function calculateRoutingTables(mesh: Mesh): Map<string, PeerRoutingTable> {
  const routingTables = new Map<string, PeerRoutingTableHugo>()

  const getOrCreateRoutingTable = (peerId: string) => {
    let table = routingTables.get(peerId)
    if (!table) {
      table = new Map<string, Route>()
      routingTables.set(peerId, table)
    }
    return table
  }

  function calculateRouteBetween(fromPeer: string, toPeer: string, _excluding: string[]): Route {
    const excluding = new Set<string>(_excluding)

    const calculatedRoutes = getOrCreateRoutingTable(fromPeer)

    const calculatedRoute = calculatedRoutes.get(toPeer)
    if (calculatedRoute) {
      return calculatedRoute
    }

    let route: Route = 'server'

    const fromPeerConnections = mesh.get(fromPeer)
    if (!fromPeerConnections) {
      route = 'server'
    } else if (fromPeerConnections?.has(toPeer)) {
      route = []
    } else {
      for (const p of fromPeerConnections) {
        if (excluding.has(p)) {
          continue
        }
        let relayedRoute = calculateRouteBetween(p, toPeer, [p, ..._excluding])
        if (relayedRoute !== 'server') {
          relayedRoute = [p, ...relayedRoute]
          if (route === 'server' || route.length > relayedRoute.length) {
            route = relayedRoute
          }
        }
      }
    }

    calculatedRoutes.set(toPeer, route)

    // NOTE: routes are bidirectional
    getOrCreateRoutingTable(toPeer).set(fromPeer, route === 'server' ? route : Array.from(route).reverse())
    return route
  }

  const peers = new Set<string>()

  for (const [peer, connections] of mesh) {
    peers.add(peer)
    for (const connection of connections) {
      peers.add(connection)
    }
  }

  for (const peerFrom of peers) {
    for (const peerTo of peers) {
      if (peerFrom === peerTo) {
        continue
      }

      calculateRouteBetween(peerFrom, peerTo, [])
    }
  }

  const parsedRoutingTables = new Map<string, PeerRoutingTable>()

  for (const [peer, table] of routingTables) {
    const parsedTable: Record<string, PeerRoute> = {}
    for (const [currentPeer, peerRoute] of table) {
      if (peerRoute !== 'server') {
        parsedTable[currentPeer] = { peers: peerRoute }
      }
    }
    parsedRoutingTables.set(peer, { table: parsedTable })
  }
  return parsedRoutingTables
}

const allIslands: Map<Island, Mesh> = new Map()
const islandsByPeer: Map<string, Island> = new Map()
let isUpdating: boolean = false

export const routingModule: RpcServerModule<RoutingServiceDefinition, RpcContext> = {
  async updatePeerStatus(request: PeerStatus, context: RpcContext): Promise<Empty> {
    if (!isUpdating) {
      setInterval(() => updateEverything(context), 1 * 60 * 1000)
      isUpdating = true
    }
    if (!context.peer) {
      return {}
    }
    const currentIsland = allIslands.get(request.room)
    if (!currentIsland) {
      const mesh = new Map([[context.peer.address, new Set(request.connectedTo)]])
      allIslands.set(request.room, mesh)
    } else {
      currentIsland.set(context.peer.address, new Set(request.connectedTo))
    }
    islandsByPeer.set(context.peer.address, request.room)
    return {}
  },
  async *getRoutingTable(request: Empty, context: RpcContext): ServerStreamingMethodResult<PeerRoutingTable> {
    if (!isUpdating) {
      setInterval(() => updateEverything(context), 1 * 60 * 1000)
      isUpdating = true
    }
    if (!context.peer) {
      return
    }

    if (!context.peer.routingTableSubscription) {
      context.peer.routingTableSubscription = pushableChannel<PeerRoutingTable>(() => {
        // TODO: Remove current peer from all maps
      })
    }
    context.components.rpcSessions.sessions
    for await (const message of context.peer.routingTableSubscription) {
      yield message
    }
  }
}

function updateEverything(context: RpcContext): void {
  for (const [, mesh] of allIslands) {
    const tables = calculateRoutingTables(mesh)
    for (const [peer, peerRoutingTable] of tables) {
      const peerContext = context.components.rpcSessions.sessions.get(peer)
      if (!!peerContext && !!peerContext.routingTableSubscription) {
        peerContext.routingTableSubscription.push(peerRoutingTable, () => {})
      }
    }
  }
}
