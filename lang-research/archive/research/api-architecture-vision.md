# API Architecture Vision

## Current State

The API produces proxy-wrapped callable functions:

```javascript
const s = saw(440)
console.log(s)  // [Function: callable]
console.log(s._state)  // { id: 'd1', spec: {...}, inputBindings: {...}, ... }
```

The actual graph data is hidden inside `_state`. The proxy enables:
- Callable: `s(newFreq)` sets default input
- Chainable: `s.lpf()` looks up device factory, chains
- Method access: `s.freq(880)` returns new descriptor with binding
- Output access: `s.audio` returns OutputRef for explicit chaining

## What We Want

Plain objects that ARE the graph:

```javascript
const s = saw(440)
console.log(s)
// { id: 'd1', device: 'saw', inputs: { freq: 440 }, outputs: ['audio'] }

const chain = saw(440).lpf({ cutoff: 800 })
console.log(chain)
// { id: 'd2', device: 'lpf', inputs: { cutoff: 800, input: { ref: 'd1', out: 'audio' } }, outputs: ['audio'] }
```

The graph is just data. You can JSON.stringify it. You can console.log it. You can walk it trivially.

## The Tension

We need fluent API syntax:
```javascript
saw(440).lpf({ cutoff: 800 }).gain(0.5).out()
```

But plain objects don't have methods. So we need *some* wrapper.

## Options

### Option A: Proxies All The Way (Current)

Every descriptor is a Proxy that intercepts property access to enable chaining.

**Pros:**
- Seamless fluent API
- No explicit wrapping/unwrapping

**Cons:**
- Heavy: every descriptor is a callable proxy
- Opaque: can't inspect without knowing about `_state`
- Complex: proxy handlers for `get`, `apply`, `has`

### Option B: Thin Wrapper Layer

Separate the data from the API:

```typescript
// Core: plain data
interface Node {
  id: string
  device: string
  inputs: Record<string, Signal>
  outputs: string[]
}

// API: wrapper that returns Nodes but enables chaining
function saw(freq: number): Chainable<Node> {
  const node: Node = { id: nextId(), device: 'saw', inputs: { freq }, outputs: ['audio'] }
  return wrap(node)
}

// wrap() creates a Proxy that:
// - Returns the underlying Node for inspection
// - Enables .method() chaining
// - Is callable for default input
```

**Pros:**
- Clear separation: data vs API convenience
- Inspectable: `unwrap(s)` or `s.node` gives plain object
- Graph walking is trivial

**Cons:**
- Two concepts: Node and Chainable<Node>
- Need to decide when to wrap/unwrap

### Option C: Method Injection via Prototype

Make Node a class with methods:

```typescript
class Node {
  id: string
  device: string
  inputs: Record<string, Signal>
  outputs: string[]

  lpf(params?) { return createNode('lpf', { input: this.ref(), ...params }) }
  gain(params?) { return createNode('gain', { input: this.ref(), ...params }) }
  // ... all devices as methods
}
```

**Pros:**
- Plain-ish objects (class instances)
- Methods are real, not proxy traps
- console.log shows properties

**Cons:**
- Every device must be a method on Node
- Can't add new devices dynamically without prototype mutation
- Doesn't support `node(value)` callable syntax cleanly

### Option D: Tagged Template / Builder Pattern

Different syntax entirely:

```javascript
const graph = audio`
  ${saw(440)} -> ${lpf({ cutoff: 800 })} -> ${gain(0.5)} -> out
`

// Or builder:
const graph = chain(saw(440)).through(lpf({ cutoff: 800 })).through(gain(0.5)).build()
```

**Pros:**
- Very explicit about what's happening
- No proxy magic

**Cons:**
- Different syntax from current
- Less ergonomic for quick sketching

## Recommendation

**Option B: Thin Wrapper Layer** seems like the best balance.

The key insight: the Proxy is only needed for the *API surface*. Internally, we work with plain Nodes. The Proxy is a view/controller layer.

```typescript
// Internal: plain node
type Node = {
  readonly id: string
  readonly device: string
  readonly inputs: Record<string, Signal>
  readonly config: Record<string, ConfigValue>
  readonly outputs: readonly string[]
}

// Signal can reference other nodes
type Signal = number | OutputRef | Lambda | Node
type OutputRef = { node: string, output: string }

// API surface: Chainable wraps a Node
type Chainable<T extends Node> = T & {
  // Callable: sets default input
  (value: Signal): Chainable<T>
  // Any property access for chaining/output access handled by proxy
  [key: string]: any
}

// Factory creates Chainable<Node>
function saw(freq?: Signal): Chainable<SawNode> {
  const node = createNode('saw', { freq: freq ?? 440 })
  return chainable(node)
}
```

The `chainable()` wrapper:
1. Returns the node itself for data access (`node.id`, `node.inputs`, etc.)
2. Intercepts unknown properties for device chaining (`.lpf()`)
3. Makes it callable for default input binding

**Crucially**: `JSON.stringify(node)` works. `console.log(node)` shows the structure. Graph traversal is just object property access.

## Migration Path

1. Define the plain Node type
2. Refactor `createDescriptor` to produce Node objects
3. Wrap in `chainable()` at API boundary
4. Update reify to work with plain Nodes
5. Proxy handler becomes thin: delegates to Node, intercepts for chaining

## Impact on Prefab

With plain Nodes, prefab becomes trivial:

```javascript
function createPrefab(name: string, tail: Node): Prefab {
  // Walk upstream from tail to find all nodes
  const subgraph = collectUpstream(tail)
  const head = findHead(subgraph)  // node with unbound defaultInput

  return {
    name,
    head,
    tail,
    nodes: subgraph,
    instantiate(source: Signal) {
      // Clone all nodes with new IDs
      const cloned = cloneSubgraph(subgraph)
      // Bind source to head's defaultInput
      cloned.head.inputs[head.defaultInput] = source
      return chainable(cloned.tail)
    }
  }
}
```

Graph walking is just:
```javascript
function collectUpstream(node: Node): Node[] {
  const nodes = [node]
  for (const signal of Object.values(node.inputs)) {
    if (isOutputRef(signal)) {
      const upstream = getNode(signal.node)
      nodes.push(...collectUpstream(upstream))
    }
  }
  return nodes
}
```

No proxy unwrapping, no `_state` access. Just data.

## Questions to Resolve

1. **Node identity**: Currently descriptors are registered globally by ID. Keep this, or make it explicit?

2. **Poly**: How do poly nodes fit? Is a poly just `{ _poly: true, voices: Node[] }`?

3. **Spec vs instance**: Currently spec (device definition) is embedded in each descriptor. Should Node reference spec by name instead?
   ```javascript
   // Current: spec embedded
   { id: 'd1', spec: { inputs: {...}, process: fn, ... }, inputBindings: {...} }

   // Proposed: reference by name
   { id: 'd1', device: 'saw', inputs: { freq: 440 } }
   // spec looked up: getDeviceSpec('saw')
   ```

4. **Immutability**: Nodes should be immutable. Methods return new nodes. How strict?

## Summary

Push complexity into core, make API products lightweight:

| Layer | Responsibility | Complexity |
|-------|---------------|------------|
| Core (Node) | Data representation | Minimal - plain objects |
| Registry | Device specs, node lookup | Moderate - maps and lookups |
| API (Chainable) | Fluent syntax | Proxy magic lives here |
| Reify | Node → Runtime | Walks plain objects |

The user sees Chainable. The system works with Node. The Proxy is just glue.
