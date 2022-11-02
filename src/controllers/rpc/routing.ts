type Route = string[] | 'server'
type PeerRoutingTable = Map<string, Route>

function calculateRoutingTables(mesh: Map<string, Set<string>>): Map<string, PeerRoutingTable> {
  const routingTables = new Map<string, PeerRoutingTable>()

  const getOrCreateRoutingTable = (peerId: string) => {
    let table = routingTables.get(peerId)
    if (!table) {
      table = new Map<string, Route>()
      routingTables.set(peerId, table)
    }
    return table
  }

  function calculateRouteBeetwen(fromPeer: string, toPeer: string, _excluding: string[]): Route {
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
        let relayedRoute = calculateRouteBeetwen(p, toPeer, [p, ..._excluding])
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

      calculateRouteBeetwen(peerFrom, peerTo, [])
    }
  }

  return routingTables
}

const mesh = new Map<string, Set<string>>()
mesh.set('1', new Set<string>(['2', '5']))
mesh.set('2', new Set<string>(['1', '3', '4']))
mesh.set('3', new Set<string>(['2', '4', '6']))
mesh.set('4', new Set<string>(['2', '3']))
mesh.set('5', new Set<string>(['1']))
mesh.set('6', new Set<string>(['3', '4', '7']))
mesh.set('7', new Set<string>(['6']))

const routingTables = calculateRoutingTables(mesh)

// Used paths between two nodes, and a list of routes in which they are used
const usedPaths = new Map<string, [string, string][]>()

function generateKey(s: string, e: string): string {
  return s <= e ? `${s}.${e}` : `${e}.${s}`
}
function processRoute(route: string[]) {
  for (let start = 0; start < route.length - 1; start++) {
    for (let end = start + 1; end < route.length; end++) {
      const key = generateKey(route[start], route[end])
      const result = usedPaths.get(key) || []
      result.push([route[0], route[route.length - 1]])
      usedPaths.set(key, result)
    }
  }
}

for (const [start, table] of routingTables) {
  for (const [end, route] of table) {
    processRoute([start, ...route, end])
  }
}

console.log(routingTables.get('1'))
// console.log(usedPaths)

// // processing removed routes
// const removed = ['1', '2']
// const usedIn = usedPaths.get(generateKey(removed[0], removed[1]))
// if (usedIn) {
//   for (const [start, end] of usedIn) {
//     routingTables.get(start)!.set(end, 'server')
//   }
// }

// console.log(routingTables)
