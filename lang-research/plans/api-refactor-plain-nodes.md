# API Refactor: Plain Data Nodes

## Goal

Transform the descriptor system so the API produces plain, inspectable data structures. Push proxy complexity to a thin wrapper layer. Enable a clear compilation pipeline:

```
API output (flat graph) → poly expansion pass → compile to runtime
```

## Decision: Flat Graph Structure

The API produces a **flat list of nodes** that reference each other by ID:

```javascript
saw(440).lpf({ cutoff: lfo(2).scale({ min: 200, max: 2000 }) }).gain({ level: lfo(2) })
```

Produces:

```javascript
{
  nodes: [
    { id: 'lfo1', device: 'lfo', inputs: { rate: 2 } },
    { id: 'saw1', device: 'saw', inputs: { freq: 440 } },
    { id: 'gain1', device: 'gain', inputs: { input: { ref: 'saw1' }, level: { ref: 'lfo1' } } },
    { id: 'scale1', device: 'scale', inputs: { input: { ref: 'lfo1' }, min: 200, max: 2000 } },
    { id: 'lpf1', device: 'lpf', inputs: { input: { ref: 'gain1' }, cutoff: { ref: 'scale1' }, resonance: 0.5 } }
  ],
  output: 'lpf1'
}
```

**Why flat:**
- Handles shared nodes naturally (same lfo feeding multiple devices)
- Easy to serialize (JSON.stringify works)
- Easy to visualize (graphviz DOT in ~50 lines)
- Easy to traverse and transform

**Validated:** We built `graph-to-dot.ts` that renders this structure to SVG via graphviz.

## Current Architecture (Problems)

```javascript
saw(440)
// Returns: Proxy-wrapped callable function
// console.log shows: [Function: callable]
// Actual data hidden in _state: { id, spec, inputBindings, configBindings }
```

1. **Opaque output**: Can't console.log the graph
2. **Heavy descriptors**: Every node is a Proxy with callable behavior
3. **Poly expansion at API time**: Arrays expand immediately in `createDescriptor`
4. **Embedded specs**: Full DeviceSpec stored in every descriptor
5. **`poly()` is user-facing**: Leaky abstraction - users shouldn't need it

## Proposed Architecture

### Three-Stage Pipeline

```
Stage 1: API          Stage 2: Expansion      Stage 3: Compile
─────────────────     ─────────────────────   ────────────────
User code             expandPoly()            compile()
  ↓                     ↓                       ↓
FlatGraph             FlatGraph               Runtime
(arrays unexpanded)   (all poly resolved)     (ready for worklet)
```

### Core Types

```typescript
interface FlatGraph {
  nodes: Node[]
  output: string  // id of output node
}

interface Node {
  id: string
  device: string                      // device name, spec looked up separately
  inputs: Record<string, NodeInput>
  config: Record<string, ConfigValue>
}

type NodeInput =
  | number                    // constant
  | number[]                  // poly (unexpanded) - user-driven
  | OutputRef                 // connection to another node
  | Lambda                    // per-sample function
  | Node[]                    // device-expanded poly (from seq, spread)

interface OutputRef {
  ref: string   // node id
  out: string   // output name
}
```

### Poly Handling

**Two kinds of poly:**

1. **User-driven** (`[440, 550]`): Stays as array in node inputs, expanded by `expandPoly()` pass
2. **Device-driven** (seq, spread): Device's `expand` returns array of nodes at API time

```javascript
// User-driven: array stays in inputs until expansion pass
saw([440, 550])
// → node: { id: 'd1', device: 'saw', inputs: { freq: [440, 550] } }

// Device-driven: expand returns array of nodes immediately
seq("{c4,e4,g4}")
// → nodes: [
//     { id: 'd1', device: 'seq', inputs: { pattern: 'c4', ... } },
//     { id: 'd2', device: 'seq', inputs: { pattern: 'e4', ... } },
//     { id: 'd3', device: 'seq', inputs: { pattern: 'g4', ... } }
//   ]
```

Device-driven expansion happens at API time because the device owns the decomposition logic (e.g., seq parses pattern syntax).

### Chaining Layer

Fluent API via thin proxy wrapper over plain nodes:

```typescript
function wrap(node: Node, graph: FlatGraph): Chainable<Node>
function wrap(nodes: Node[], graph: FlatGraph): Chainable<Node[]>
```

The wrapper:
- Makes nodes callable (sets default input)
- Intercepts property access for chaining (`.lpf()`)
- Returns output refs for explicit output access (`.cv`)
- Accumulates nodes into the graph

When chaining from an array, map the operation:
```javascript
seq("{c4,e4}").saw()
// seq returns [node1, node2]
// .saw() maps: [saw({ freq: node1.cv }), saw({ freq: node2.cv })]
```

### Expansion Pass

`expandPoly(graph: FlatGraph): FlatGraph` walks nodes and:

1. Finds array inputs (user-driven poly)
2. Determines voice count (arrays must match or be 1 for broadcast)
3. Duplicates nodes that have poly inputs
4. Duplicates downstream dependent nodes
5. Distributes array values by index
6. Updates references

```javascript
// Before expansion:
nodes: [
  { id: 'd1', device: 'saw', inputs: { freq: [440, 550] } },
  { id: 'd2', device: 'gain', inputs: { level: [0.5, 0.8], input: { ref: 'd1' } } }
]

// After expansion:
nodes: [
  { id: 'd1.0', device: 'saw', inputs: { freq: 440 } },
  { id: 'd1.1', device: 'saw', inputs: { freq: 550 } },
  { id: 'd2.0', device: 'gain', inputs: { level: 0.5, input: { ref: 'd1.0' } } },
  { id: 'd2.1', device: 'gain', inputs: { level: 0.8, input: { ref: 'd1.1' } } }
]
```

Edge cases:
- **Mismatched lengths**: Error (3 vs 2 is ambiguous)
- **Scalar into poly**: Broadcast scalar to all voices
- **Scalar upstream, poly downstream**: Duplicate upstream node per voice

### Device Expand API

Device `expand` returns node(s), not `poly()`:

```typescript
interface DeviceSpec {
  // ...
  expand?: (config, inputs, createNode) => Node | Node[]
}

// seq implementation:
expand(config, inputs, createNode) {
  const pattern = config.pattern
  const voices = voiceCount(parseExpr(pattern))

  if (voices === 1) {
    return createNode('seq', { pattern, clk: inputs.clk })
  }

  // Return array of nodes
  return decomposePattern(pattern).map(mono =>
    createNode('seq', { pattern: mono, clk: inputs.clk })
  )
}
```

### What `poly()` Becomes

`poly()` becomes internal or removed. Users just use arrays:

```javascript
// Old
poly([saw(440), saw(550)])

// New - just arrays
[saw(440), saw(550)]

// Or via array input (more common)
saw([440, 550])
```

## Visualization

The flat graph structure renders trivially to graphviz:

```javascript
graphToDot(graph)  // → DOT string
```

Output shows:
- Nodes as boxes with `device(args)` labels
- Solid lines for default input (signal flow)
- Dashed gray lines for non-default inputs (modulation)
- Bold border on output node

See `src/tools/graph-to-dot.ts` for implementation.

## Files to Modify

### Core Changes

| File | Change |
|------|--------|
| `descriptor/types.ts` | Define `Node`, `FlatGraph`, `NodeInput` |
| `descriptor/device.ts` | Return plain nodes, defer array expansion |
| `descriptor/poly.ts` | Make internal or remove |
| `descriptor/proxy/` | Thin wrapper for chaining only |
| `descriptor/registry.ts` | Device specs only, no node registry needed |

### New Files

| File | Purpose |
|------|---------|
| `graph/expand-poly.ts` | Poly expansion pass |
| `graph/flat-graph.ts` | FlatGraph construction utilities |
| `descriptor/wrap.ts` | Chainable wrapper for nodes |

### Update Consumers

| File | Change |
|------|--------|
| `graph/reify.ts` | Work with FlatGraph |
| `graph/out.ts` | Collect FlatGraph, run expansion |
| `devices/seq/seq.ts` | Return node arrays from expand |
| `devices/spread.ts` | Return node arrays from expand |

## Migration Strategy

### Phase 1: Define Types

1. Define `Node`, `FlatGraph`, `NodeInput` types
2. Create `graph-to-dot.ts` visualization (done)
3. Write tests with mock graphs

### Phase 2: Dual Mode

1. Add `FlatGraph` collection alongside current descriptors
2. `out()` can produce either representation
3. Validate both produce same runtime result

### Phase 3: Node-First Creation

1. Device factories create plain nodes
2. `wrap()` adds chainable behavior
3. Remove array expansion from factory
4. Update `expand` hook signature

### Phase 4: Expansion Pass

1. Implement `expandPoly()`
2. `out()` runs expansion before compile
3. Remove `poly()` from public API

### Phase 5: Cleanup

1. Remove `_poly` marker and `PolyDescriptor`
2. Remove `_state` wrapper
3. Simplify type guards

## Verification

### Console.log Test

```javascript
const graph = collectGraph(() => saw(440).lpf({ cutoff: 800 }).out())
console.log(JSON.stringify(graph, null, 2))
// Shows readable flat structure
```

### Visualization Test

```javascript
const svg = renderGraph(graph)
// Opens in browser, shows node diagram
```

### Expansion Test

```javascript
const before = collectGraph(() => saw([440, 550]).gain([0.5, 0.8]).out())
console.log(before.nodes.length)  // 2 nodes

const after = expandPoly(before)
console.log(after.nodes.length)   // 4 nodes, properly distributed
```

### Existing Tests

All 240+ tests should pass after migration (behavior unchanged, only representation).

## Benefits

1. **Inspectable**: console.log shows the graph
2. **Serializable**: JSON.stringify works
3. **Visualizable**: graphviz rendering in 50 lines
4. **Simpler**: No proxy magic in core data
5. **Transformable**: Easy to write graph passes (expansion, optimization, prefab)
6. **Debuggable**: Can see exactly what the API produced
