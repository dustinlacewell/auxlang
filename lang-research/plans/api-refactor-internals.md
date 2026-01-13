# API Refactor: Internals & Compilation

Companion to `api-refactor-plain-nodes.md`. Focuses on how the internal machinery changes.

## Current Internal Flow

```
User code
  ↓
device() factory
  ↓ creates Proxy-wrapped descriptor with _state
  ↓ immediately expands arrays/poly
  ↓ normalizes signals (descriptors → OutputRefs)
  ↓ registers descriptor in global registry
Descriptor (Proxy)
  ↓
.out() called
  ↓
reify() walks _state, builds runtime Graph
  ↓
Graph { nodes: GraphNode[], outputNodeId }
  ↓
sent to AudioWorklet
```

### Key Files

| File | Role |
|------|------|
| `descriptor/device.ts` | Factory creation, descriptor proxies, expansion |
| `descriptor/types.ts` | Descriptor, DescriptorState, Signal types |
| `descriptor/poly.ts` | PolyDescriptor wrapper, isPoly, poly() |
| `descriptor/registry.ts` | Global descriptor + device registries |
| `descriptor/proxy/chainable-output.ts` | Output chaining proxy |
| `graph/reify.ts` | Descriptor → runtime Graph |
| `graph/out.ts` | Output collection, stereo handling |
| `graph/types.ts` | GraphNode, ResolvedInput |

## New Internal Flow

```
User code
  ↓
device() factory
  ↓ creates plain Node
  ↓ wraps in Chainable proxy (for fluent API)
  ↓ accumulates Node into GraphBuilder
  ↓ device-driven expand (seq, spread) returns Node[]
Chainable<Node> or Chainable<Node[]>
  ↓
.out() called
  ↓
GraphBuilder.build() returns FlatGraph
  ↓
expandPoly(FlatGraph) expands user-driven arrays
  ↓
compile(FlatGraph) builds runtime representation
  ↓
sent to AudioWorklet
```

## GraphBuilder

Central accumulator for nodes during API execution:

```typescript
class GraphBuilder {
  private nodes: Map<string, Node> = new Map()
  private outputs: string[] = []

  addNode(node: Node): void {
    this.nodes.set(node.id, node)
  }

  addNodes(nodes: Node[]): void {
    for (const node of nodes) {
      this.nodes.set(node.id, node)
    }
  }

  setOutput(nodeId: string | string[]): void {
    this.outputs = Array.isArray(nodeId) ? nodeId : [nodeId]
  }

  build(): FlatGraph {
    return {
      nodes: Array.from(this.nodes.values()),
      output: this.outputs.length === 1 ? this.outputs[0] : this.outputs
    }
  }
}

// Global instance, reset between evaluations
let currentBuilder: GraphBuilder | null = null

function getBuilder(): GraphBuilder {
  if (!currentBuilder) {
    currentBuilder = new GraphBuilder()
  }
  return currentBuilder
}
```

## Node Creation

Plain node factory, no proxy:

```typescript
let nodeCounter = 0

function createNode(
  device: string,
  inputs: Record<string, NodeInput>,
  config: Record<string, ConfigValue> = {}
): Node {
  const id = `${device}${++nodeCounter}`
  const node: Node = { id, device, inputs, config }
  getBuilder().addNode(node)
  return node
}
```

## Chainable Wrapper

Thin proxy that enables fluent API over plain nodes:

```typescript
function wrap<T extends Node | Node[]>(value: T): Chainable<T> {
  if (Array.isArray(value)) {
    return wrapArray(value)
  }
  return wrapNode(value)
}

function wrapNode(node: Node): Chainable<Node> {
  const spec = getDeviceSpec(node.device)

  return new Proxy(node, {
    get(target, prop: string) {
      // Plain node properties pass through
      if (prop in target) {
        return target[prop as keyof Node]
      }

      // Output access: node.cv, node.audio, etc.
      if (spec.outputs.includes(prop)) {
        return { ref: node.id, out: prop }
      }

      // Input setter: node.freq(440) returns new wrapped node
      if (prop in spec.inputs) {
        return (value: NodeInput) => {
          const newNode = createNode(node.device, { ...node.inputs, [prop]: value }, node.config)
          return wrap(newNode)
        }
      }

      // Device chaining: node.lpf() creates new lpf node
      const chainFactory = getDeviceFactory(prop)
      if (chainFactory) {
        return (params?: Record<string, NodeInput>) => {
          const chainSpec = getDeviceSpec(prop)
          const outputRef = { ref: node.id, out: spec.defaultOutput }
          const inputs = { ...params, [chainSpec.defaultInput]: outputRef }
          return chainFactory(inputs)
        }
      }

      return undefined
    },

    apply(target, thisArg, args) {
      // node(value) sets default input
      const [value] = args
      const newNode = createNode(node.device, { ...node.inputs, [spec.defaultInput]: value }, node.config)
      return wrap(newNode)
    }
  }) as Chainable<Node>
}

function wrapArray(nodes: Node[]): Chainable<Node[]> {
  return new Proxy(nodes, {
    get(target, prop: string) {
      if (prop === 'length' || prop === 'map' || prop === 'forEach') {
        return target[prop as keyof Node[]]
      }

      // Check if first node has this as output/input/device
      const firstNode = target[0]
      if (!firstNode) return undefined

      const spec = getDeviceSpec(firstNode.device)

      // Output access: maps to array of OutputRefs
      if (spec.outputs.includes(prop)) {
        return target.map(n => ({ ref: n.id, out: prop }))
      }

      // Input setter: maps across all nodes
      if (prop in spec.inputs) {
        return (value: NodeInput) => {
          const newNodes = target.map((n, i) => {
            const v = Array.isArray(value) ? value[i % value.length] : value
            return createNode(n.device, { ...n.inputs, [prop]: v }, n.config)
          })
          return wrap(newNodes)
        }
      }

      // Device chaining: maps factory across all nodes
      const chainFactory = getDeviceFactory(prop)
      if (chainFactory) {
        return (params?: Record<string, NodeInput>) => {
          const chainSpec = getDeviceSpec(prop)
          const newNodes = target.map((n, i) => {
            const outputRef = { ref: n.id, out: spec.defaultOutput }
            const resolvedParams = resolveParamsForVoice(params, i)
            const inputs = { ...resolvedParams, [chainSpec.defaultInput]: outputRef }
            const result = chainFactory(inputs)
            return Array.isArray(result) ? result : [result]
          }).flat()
          return wrap(newNodes)
        }
      }

      return undefined
    }
  }) as Chainable<Node[]>
}
```

## Device Factory

Simplified factory that returns wrapped nodes:

```typescript
function device(name: string, spec: DeviceSpecInput) {
  const normalizedSpec = normalizeSpec(spec)

  const factory = (inputs?: Record<string, NodeInput>): Chainable<Node | Node[]> => {
    // If device has expand hook, use it
    if (normalizedSpec.expand) {
      const result = normalizedSpec.expand(inputs?.config || {}, inputs || {}, createNode)
      if (Array.isArray(result)) {
        return wrap(result)
      }
      return wrap(result)
    }

    // Normal device: create single node
    const node = createNode(name, inputs || {}, {})
    return wrap(node)
  }

  registerDevice(name, factory, normalizedSpec)
  return factory
}
```

## Poly Expansion Pass

Runs after API execution, before compilation:

```typescript
interface ExpansionContext {
  voiceCount: number
  nodeMap: Map<string, string[]>  // oldId -> newIds[]
}

function expandPoly(graph: FlatGraph): FlatGraph {
  // Build dependency graph
  const deps = buildDependencies(graph)      // nodeId -> nodeIds it depends on
  const dependents = buildDependents(graph)  // nodeId -> nodeIds that depend on it

  // Find poly sources (nodes with array inputs)
  const polySources = findPolySources(graph)

  if (polySources.length === 0) {
    return graph  // No expansion needed
  }

  // Determine voice count from all poly sources
  const voiceCount = determineVoiceCount(polySources)

  // Find all nodes that need duplication (poly sources + downstream)
  const toExpand = new Set<string>()
  for (const source of polySources) {
    toExpand.add(source.id)
    for (const depId of getDownstream(source.id, dependents)) {
      toExpand.add(depId)
    }
  }

  // Clone nodes
  const nodeMap = new Map<string, string[]>()  // oldId -> [newId0, newId1, ...]
  const newNodes: Node[] = []

  for (const node of graph.nodes) {
    if (toExpand.has(node.id)) {
      // Duplicate this node for each voice
      const clones: string[] = []
      for (let v = 0; v < voiceCount; v++) {
        const newId = `${node.id}.${v}`
        clones.push(newId)
        const newInputs = expandInputs(node.inputs, v, voiceCount, nodeMap)
        newNodes.push({ ...node, id: newId, inputs: newInputs })
      }
      nodeMap.set(node.id, clones)
    } else {
      // Keep as-is
      newNodes.push(node)
      nodeMap.set(node.id, [node.id])
    }
  }

  // Update output
  const outputIds = Array.isArray(graph.output) ? graph.output : [graph.output]
  const newOutputs = outputIds.flatMap(id => nodeMap.get(id) || [id])

  return {
    nodes: newNodes,
    output: newOutputs.length === 1 ? newOutputs[0] : newOutputs
  }
}

function expandInputs(
  inputs: Record<string, NodeInput>,
  voiceIndex: number,
  voiceCount: number,
  nodeMap: Map<string, string[]>
): Record<string, NodeInput> {
  const result: Record<string, NodeInput> = {}

  for (const [key, value] of Object.entries(inputs)) {
    if (Array.isArray(value) && typeof value[0] === 'number') {
      // Number array: distribute by index (wrap around)
      result[key] = value[voiceIndex % value.length]
    } else if (isOutputRef(value)) {
      // Reference: update to point to cloned node
      const newIds = nodeMap.get(value.ref)
      if (newIds && newIds.length > 1) {
        result[key] = { ref: newIds[voiceIndex % newIds.length], out: value.out }
      } else {
        result[key] = value
      }
    } else {
      // Scalar or lambda: broadcast
      result[key] = value
    }
  }

  return result
}

function determineVoiceCount(sources: Node[]): number {
  let maxCount = 1
  for (const node of sources) {
    for (const value of Object.values(node.inputs)) {
      if (Array.isArray(value)) {
        maxCount = Math.max(maxCount, value.length)
      }
    }
  }
  return maxCount
}
```

### Array Length Strategy

When arrays have different lengths, use **wrap-around**:

```javascript
saw([440, 550, 660]).gain([0.5, 0.8])
// 3 voices, gains wrap: [0.5, 0.8, 0.5]
```

This is predictable and matches musical intuitions (patterns repeat).

## Compilation (Reify Replacement)

Convert FlatGraph to runtime representation:

```typescript
interface RuntimeGraph {
  nodes: RuntimeNode[]
  outputIds: string[]
}

interface RuntimeNode {
  id: string
  process: ProcessFn
  inputSources: Record<string, ResolvedSource>
  config: Record<string, ConfigValue>
  state: Record<string, unknown>
}

type ResolvedSource =
  | { type: 'constant', value: number }
  | { type: 'connection', nodeId: string, output: string }
  | { type: 'lambda', fn: SignalLambda }

function compile(graph: FlatGraph): RuntimeGraph {
  const nodes: RuntimeNode[] = []

  // Topological sort
  const sorted = topologicalSort(graph)

  for (const node of sorted) {
    const spec = getDeviceSpec(node.device)

    const inputSources: Record<string, ResolvedSource> = {}
    for (const [name, def] of Object.entries(spec.inputs)) {
      const binding = node.inputs[name]
      inputSources[name] = resolveSource(binding, def.default)
    }

    nodes.push({
      id: node.id,
      process: spec.process,
      inputSources,
      config: { ...getConfigDefaults(spec), ...node.config },
      state: {}
    })
  }

  const outputIds = Array.isArray(graph.output) ? graph.output : [graph.output]

  return { nodes, outputIds }
}

function resolveSource(binding: NodeInput | undefined, defaultValue: number): ResolvedSource {
  if (binding === undefined) {
    return { type: 'constant', value: defaultValue }
  }
  if (typeof binding === 'number') {
    return { type: 'constant', value: binding }
  }
  if (isOutputRef(binding)) {
    return { type: 'connection', nodeId: binding.ref, output: binding.out }
  }
  if (typeof binding === 'function') {
    return { type: 'lambda', fn: binding }
  }
  // Array shouldn't exist after expansion
  throw new Error(`Unexpected array in binding after expansion`)
}
```

## Output Collection

The `out()` function only marks what the output is - it does NOT trigger compilation:

```typescript
function out(signal: Chainable<Node | Node[]>): void {
  const builder = getBuilder()
  const nodeIds = Array.isArray(signal) ? signal.map(n => n.id) : [signal.id]
  builder.setOutput(nodeIds)
}
```

## Evaluation Mechanism

The evaluation mechanism (external to user code) handles the full pipeline:

```typescript
// Get just the flat graph (for debugging/visualization)
function evaluateToGraph(userCode: () => void): FlatGraph {
  currentBuilder = new GraphBuilder()
  userCode()
  const graph = currentBuilder.build()
  currentBuilder = null
  return graph
}

// Full pipeline: graph → expansion → compilation
function evaluate(userCode: () => void): RuntimeGraph {
  const flatGraph = evaluateToGraph(userCode)
  const expanded = expandPoly(flatGraph)
  const runtime = compile(expanded)
  return runtime
}

// Production use
function evaluateAndRun(userCode: () => void): void {
  const runtime = evaluate(userCode)
  sendToWorklet(runtime)
}
```

This separation enables:

```typescript
// Debug: inspect the flat graph
const graph = evaluateToGraph(() => {
  saw(440).lpf({ cutoff: 800 }).out()
})
console.log(JSON.stringify(graph, null, 2))
renderGraph(graph)  // visualize with graphviz

// Debug: inspect after expansion
const expanded = expandPoly(graph)
console.log('Before:', graph.nodes.length, 'nodes')
console.log('After:', expanded.nodes.length, 'nodes')
renderGraph(expanded)

// Production: compile and run
evaluateAndRun(() => {
  saw(440).lpf({ cutoff: 800 }).out()
})
```

Multiple `out()` calls just update the output marker - only the last one matters (or they accumulate if we want multiple outputs).

## Stereo Handling

Stereo is just 2-voice poly at the output:

```typescript
function collectStereoGraph(): { left: RuntimeGraph, right: RuntimeGraph } {
  const builder = getBuilder()
  const flatGraph = builder.build()
  const expanded = expandPoly(flatGraph)

  const outputIds = Array.isArray(expanded.output) ? expanded.output : [expanded.output]

  if (outputIds.length === 1) {
    // Mono: duplicate to both channels
    const runtime = compile(expanded)
    return { left: runtime, right: runtime }
  }

  if (outputIds.length === 2) {
    // Stereo: first is left, second is right
    return {
      left: compile({ ...expanded, output: outputIds[0] }),
      right: compile({ ...expanded, output: outputIds[1] })
    }
  }

  // More than 2: mix down with spread or just take first 2
  // ... mixing logic
}
```

## Registry Simplification

Only need device registry, not descriptor registry:

```typescript
// Device specs and factories
const deviceRegistry = new Map<string, { factory: DeviceFactory, spec: DeviceSpec }>()

function registerDevice(name: string, factory: DeviceFactory, spec: DeviceSpec): void {
  deviceRegistry.set(name, { factory, spec })
}

function getDeviceFactory(name: string): DeviceFactory | undefined {
  return deviceRegistry.get(name)?.factory
}

function getDeviceSpec(name: string): DeviceSpec | undefined {
  return deviceRegistry.get(name)?.spec
}

// No more descriptor registry - nodes live in GraphBuilder
```

## Migration Notes

### What Goes Away

- `DescriptorState` with embedded spec
- `_state` property on descriptors
- `PolyDescriptor` and `_poly` marker
- `isPoly()`, `isDescriptor()` in their current form
- `normalizeSignal()` (descriptors → OutputRefs at binding time)
- Global descriptor registry
- `NormalizedPoly`, `BoundPoly` types

### What Changes

- `createDescriptor` → `createNode` (plain objects)
- Proxy wrapper moves from descriptor to `wrap()`
- Expansion moves from factory to dedicated pass
- `reify()` → `compile()` (works on FlatGraph)
- Device `expand` returns `Node | Node[]` not `PolyDescriptor`

### What Stays Similar

- Device spec structure (inputs, outputs, process, config)
- Fluent API syntax from user perspective
- Overall pipeline: API → some processing → runtime

## Testing Strategy

1. **Unit tests for expansion**: Mock FlatGraphs, verify expansion output
2. **Unit tests for compile**: Mock expanded graphs, verify runtime structure
3. **Integration tests**: Existing API tests should still pass
4. **Visual verification**: graphToDot before/after expansion
