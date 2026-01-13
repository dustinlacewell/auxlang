# Ontology - What Kinds of Things Exist

This file catalogs the distinct categories of entities in the system.
Updated as each source file is analyzed.

---

## Core Entities

### Node
**File**: `src/core2/graph/node.ts`
**What it is**: Static description of a computation unit
**Properties**: id, device (name), inputs, config
**Key insight**: Plain data, no behavior, no poly concept

### DeviceSpec
**File**: `src/core2/device/device-spec.ts`
**What it is**: Blueprint/template for a type of device
**Properties**: inputs schema, outputs, process fn, polyphonic flag, expand hook
**Key insight**: Conflates schema, runtime, and expansion

### OutputRef
**File**: `src/core2/graph/output-ref.ts`
**What it is**: Symbolic pointer to a node's output
**Properties**: ref (node ID), out (output name)
**Key insight**: Graph edges are symbolic names, not object refs

### NodeInput
**File**: `src/core2/signal/node-input.ts`
**What it is**: What can flow into a node input
**Values**: number | number[] | OutputRef | OutputRef[] | SignalLambda
**Key insight**: Poly is encoded here - arrays represent multiple voices

### WrappedNode
**File**: `src/core2/wrap/wrap.ts`
**What it is**: Proxy around Node enabling fluent API
**Provides**: Chaining, input setters, output access
**Key insight**: User-facing API layer, creates nodes

### GraphBuilder
**File**: `src/core2/graph/graph-builder.ts`
**What it is**: Accumulator for nodes during API execution
**Operations**: addNode, build
**Key insight**: Dumb bag, no graph semantics

### FlatGraph
**File**: `src/core2/graph/flat-graph.ts` (interface)
**What it is**: Output of API phase - just `{ nodes: Node[] }`
**Key insight**: Graph structure is implicit in OutputRefs

### StereoGraph
**File**: `src/core2/graph/expand-poly.ts` (interface)
**What it is**: Output of expansion - nodes + stereo routing
**Key insight**: Adds L/R channel assignment

---

## Relationships

### Node → Node (Connection)
- Via OutputRef in inputs
- Symbolic (by ID), not direct pointer
- Discovered during topological sort

### DeviceSpec → Node (Instantiation)
- Factory creates Node with device name
- Spec looked up later by name

### Node → Builder (Registration)
- Node added to builder via addNode()
- Some paths skip this (BUG)

### WrappedNode → Node (Wrapping)
- Proxy wraps Node
- Delegates property access
- Creates new nodes on certain operations

---

## Poly-Related Concepts

### Voice
**What it is**: One lane of parallel computation
**Representation**:
- As data: element in number[] or OutputRef[]
- As structure: separate Node with `.N` suffix

### Voice Count
**Where determined**:
- Explicit: array length at API time
- Semantic: expand() return count
- Inherited: from upstream via expansion

### Polyphonic (flag)
**What it means**: Device handles poly internally
**Effect**: Don't duplicate this node when inputs are poly
**Examples**: spread, pan, mix(?)

### Expand (hook)
**What it means**: Device transforms into different nodes
**Timing**: Called during expandPoly pass
**Returns**: WrappedNode or WrappedNode[]

---

## Behavioral Categories

### Passthrough Device
- No special poly handling
- Gets duplicated when upstream is poly
- Examples: osc, lpf, gain

### Semantic Expander
- Has expand() hook
- Creates nodes based on config/pattern
- Examples: chord, seq

### Topology Transformer
- polyphonic: true + expand()
- N voices in → M voices out
- Examples: spread, pan

### Aggregator
- Multiple named inputs
- Combines to single output
- Examples: mix

---

## Open Categories (Need Investigation)

### SignalLambda
**File**: `src/core2/signal/signal-lambda.ts`
**What it is**: Per-sample inline function
**Questions**: How does it interact with poly?

### ConfigValue
**File**: `src/core2/signal/config-value.ts`
**What it is**: Static configuration (not signal)
**Questions**: Can config be poly?

### InputDef
**File**: `src/core2/device/input-def.ts`
**What it is**: Schema for an input
**Questions**: Does it carry type info? Poly info?
