import fs from 'fs'

type Graph = {
  V: number
  matrix: number[][]
}

function primMST({ matrix, V }: Graph) {
  // A utility function to find the vertex with
  // minimum key value, from the set of vertices
  // not yet included in MST
  function minKey(key: number[], mstSet: boolean[]): number {
    // Initialize min value
    let min = Number.MAX_VALUE
    let min_index: number = 0

    for (let v = 0; v < V; v++) {
      if (mstSet[v] == false && key[v] < min) {
        min = key[v]
        min_index = v
      }
    }

    return min_index
  }

  // Array to store constructed MST
  let parent: number[] = []

  // Key values used to pick minimum weight edge in cut
  let key: number[] = []

  // To represent set of vertices included in MST
  let mstSet: boolean[] = []

  // Initialize all keys as INFINITE
  for (let i = 0; i < V; i++) {
    key[i] = Number.MAX_VALUE
    mstSet[i] = false
  }

  // Always include first 1st vertex in MST.
  // Make key 0 so that this vertex is picked as first vertex.
  key[0] = 0
  parent[0] = -1 // First node is always root of MST

  // The MST will have V vertices
  for (let count = 0; count < V - 1; count++) {
    // Pick the minimum key vertex from the
    // set of vertices not yet included in MST
    let u = minKey(key, mstSet)

    // Add the picked vertex to the MST Set
    mstSet[u] = true

    // Update key value and parent index of
    // the adjacent vertices of the picked vertex.
    // Consider only those vertices which are not
    // yet included in MST
    for (let v = 0; v < V; v++)
      // matrix[u][v] is non zero only for adjacent vertices of m
      // mstSet[v] is false for vertices not yet included in MST
      // Update the key only if matrix[u][v] is smaller than key[v]
      if (matrix[u][v] && mstSet[v] == false && matrix[u][v] < key[v]) {
        parent[v] = u
        key[v] = matrix[u][v]
      }
  }
  return parent
}

function createRandomGraph(): Graph {
  const V = 10
  const matrix: number[][] = new Array(V)
  for (let u = 0; u < V; u++) {
    matrix[u] = new Array(V)
  }

  for (let u = 0; u < V; u++) {
    for (let v = 0; v < V; v++) {
      const value = u === v || Math.random() < 0.5 ? 0 : 1
      matrix[u][v] = value
      matrix[v][u] = value
    }
  }

  return {
    matrix,
    V
  }
}

function test() {
  const graph = createRandomGraph()
  const start = Date.now()

  const parent = primMST(graph)

  const end = Date.now()

  console.log('TOOK: ', end - start)

  const mstEdges: number[][] = []

  for (let i = 1; i < graph.V; i++) {
    mstEdges.push([parent[i], i])
  }

  const dot: string[] = []

  dot.push('graph {')
  for (let u = 0; u < graph.V; u++) {
    for (let v = u; v < graph.V; v++) {
      if (graph.matrix[u][v]) {
        if (mstEdges.find(([_u, _v]) => (_u === u && _v === v) || (_v === u && _u === v))) {
          dot.push(`${u} -- ${v} [color=red]`)
        } else {
          dot.push(`${u} -- ${v}`)
        }
      }
    }
  }
  dot.push('}')

  fs.writeFileSync('graph.json', JSON.stringify(graph))
  fs.writeFileSync('graph.dot', dot.join('\n'))
}

test()
