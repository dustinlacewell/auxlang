# Core2 Internals

A maintainer's guide to the core2 audio graph system.

## Conceptual Model

Core2 is a **lazy graph builder**. User code doesn't execute audio - it constructs a graph of nodes that gets compiled and sent to an AudioWorklet.

```
User Code → Nodes (plain data) → FlatGraph → expandPoly → RuntimeGraph → WorkletGraph → AudioWorklet
```

### Key Abstractions

1. **Node** - Plain data object: `{ id, device, inputs, config }`. No behavior, no proxy.
2. **WrappedNode** - Proxy around Node that enables fluent API (`saw(440).lpf(800)`)
3. **WrappedArray** - Proxy around Node[] for poly operations
4. **OutputRef** - Reference to a node's output: `{ ref: nodeId, out: outputName }`
5. **ChainableOutputRef** - Proxy around OutputRef that enables chaining (`seq.cv.saw()`)
6. **VoiceRef** - Symbolic reference to a specific voice: `{ type: "voiceRef", source: nodeId, index: N }`
7. **ChainableVoiceRef** - Proxy around VoiceRef that enables chaining (`seq.voices[0].saw()`)

## The Wrap System

The wrap system (`src/core2/wrap/`) bridges plain data nodes with the fluent API.

### WrappedNode Proxy

A WrappedNode is a Proxy around a **function** (to be callable) with the node's properties assigned to it:

```typescript
const callable = function () {} as unknown as WrappedNode;
Object.setPrototypeOf(callable, node);
Object.assign(callable, node);
return new Proxy(callable, handler);
```

The handler intercepts:
- **Property access** (`node.freq`) → input setter or output accessor
- **Method calls** (`node.lpf()`) → device chaining
- **Direct calls** (`node(value)`) → sets default input

### WrappedArray (Poly)

Same pattern but wraps `Node[]`. Operations map across all nodes.

**Critical**: WrappedArray is NOT a true array - `Array.isArray()` returns false. It's a Proxy around a function with indexed properties. Check with:

```typescript
function isWrappedArray(value: unknown): value is Node[] {
  if (typeof value !== "function") return false;
  if (!("length" in value)) return false;
  const v = value as { length: number; 0?: unknown };
  return typeof v.length === "number" && v.length > 0 && isNode(v[0]);
}
```

## Signal Normalization

When a signal is bound to an input, `normalizeSignal()` converts it:

- **WrappedNode** → OutputRef (using default output)
- **WrappedArray** → passes through (resolved per-voice later)
- **OutputRef** → pass through
- **number, lambda** → pass through

The key insight: WrappedArray must NOT be converted to OutputRef[] at normalization time. It needs to flow through to `resolveInputsForVoice()` during poly chaining.

## Poly Resolution

When chaining from a WrappedArray (e.g., `polySeq.cv.tri().gain({ level: polyAdsr })`):

1. The array chaining code in `wrap.ts` iterates over source nodes
2. For each voice index `i`, it calls `resolveInputsForVoice(parsedInputs, i)`
3. `resolveInputsForVoice` extracts voice `i` from any poly values in inputs

This is how `gain({ level: polyAdsr })` works - each of the 3 gains gets its corresponding adsr.

See: `src/core2/wrap/wrap.ts` → `resolveInputsForVoice()`

Compare with v1: `src/descriptor/signals/resolve-for-voice.ts`

## VoiceRef: Symbolic Voice Access

VoiceRef enables accessing individual voices from a poly source before expansion:

```javascript
let s = seq("{c4, e4, g4}")  // 3-voice poly seq
s.voices[0].saw()            // Just the first voice
s.voices[1].gate.adsr()      // Gate from second voice
```

### How VoiceRef Works

1. **At API time**: `seq.voices[0]` creates a VoiceRef: `{ type: "voiceRef", source: "seq1", index: 0 }`
2. **ChainableVoiceRef proxy**: Enables chaining (`.saw()`) and output access (`.gate`)
3. **At expansion time**: VoiceRef is resolved to an OutputRef pointing to the actual expanded node

### NodeInput Types

A node input can be any of:
- `number` - constant
- `number[]` - poly constants (triggers expansion)
- `OutputRef` - connection to node output
- `OutputRef[]` - poly connections
- `VoiceRef` - symbolic voice reference (resolved at expansion)
- `VoiceRef[]` - array of voice references
- `SignalLambda` - per-sample function

### VoiceRef vs OutputRef

- **OutputRef** points to a concrete node that exists now
- **VoiceRef** is symbolic - the actual node doesn't exist until poly expansion

This distinction matters because poly expansion creates new nodes. VoiceRef defers the resolution until after expansion, when the voice nodes actually exist.

See: `src/core2/wrap/chainable-voice-ref.ts`, `src/core2/signal/node-input.ts`

## Config vs Inputs

- **Inputs**: Modulatable signals (numbers, OutputRefs, lambdas). Resolved per-sample.
- **Config**: Static values set at node creation. Can include functions (like oscillator `shape`).

Config functions must be serialized for the worklet. In `toWorkletGraph()`:

```typescript
if (typeof value === "function") {
  config[name] = { type: "fn", source: value.toString() };
} else {
  config[name] = { type: "data", value };
}
```

**Gotcha**: If config defaults aren't copied from spec, the function won't exist in the node. Both `device.ts` and `parse-args.ts` must do `{ ...spec.config }`.

## Graph Compilation Pipeline

### 1. Collection (`collect.ts`)
Gathers all nodes from the graph builder into a FlatGraph.

### 2. Poly Expansion (`expand-poly.ts`)
Finds nodes with array inputs, duplicates them + downstream nodes.

**Note**: In core2, poly expansion often happens earlier (during API execution via WrappedArray chaining), so `expandPoly` may be a no-op.

### 3. Compile (`compile.ts`)
- Topologically sorts nodes
- Converts input bindings to ResolvedSource (constant/connection/lambda)

### 4. ToWorkletGraph (`to-worklet-graph.ts`)
- Serializes functions to strings
- Fetches WASM modules
- Creates WorkletGraph ready for postMessage

## Worklet Communication

The WorkletGraph is sent via `postMessage` to the AudioWorklet. Functions cannot be cloned - they must be serialized to strings first.

**DataCloneError debugging**: If you see "function could not be cloned", something escaped serialization. Add debug logging in `toWorkletGraph` to find it.

## Common Gotchas

### 1. WrappedArray is not Array.isArray()
Use duck-typing: check for `typeof === "function"` with `length` and indexed node properties.

### 2. Config defaults must be spread
Both factory and chaining paths must copy spec.config:
- `src/core2/device/device.ts` → `parseFactoryArgs()`
- `src/core2/wrap/parse-args.ts` → `parseArgs()`

### 3. Poly signals must flow through to voice resolution
Don't convert WrappedArray to OutputRef[] in normalizeSignal. Let it reach resolveInputsForVoice.

### 4. Proxy traps
When checking properties on Proxies, use `in` operator or direct property access. Some checks like `Array.isArray()` look at internal slots that Proxies don't have.

## File Map

```
src/core2/
├── device/
│   ├── device.ts          # Device factory, registers devices
│   ├── device-spec.ts     # DeviceSpec type
│   ├── create-device-node.ts
│   └── registry.ts        # Device registry
├── wrap/
│   ├── wrap.ts            # WrappedNode, WrappedArray proxies
│   ├── chainable-output-ref.ts  # OutputRef chaining
│   └── parse-args.ts      # Argument parsing for device calls
├── signal/
│   ├── normalize.ts       # Signal normalization
│   └── node-input.ts      # NodeInput type
├── graph/
│   ├── node.ts            # Node type (plain data)
│   ├── create-node.ts     # Node creation
│   ├── expand-poly.ts     # Poly expansion pass
│   └── graph-builder.ts   # Collects nodes during eval
├── eval/
│   ├── run-code.ts        # Executes user code
│   ├── collect.ts         # Collects graph from builder
│   └── reset.ts           # Resets graph builder
├── runtime/
│   ├── compile.ts         # FlatGraph → RuntimeGraph
│   ├── to-worklet-graph.ts # RuntimeGraph → WorkletGraph (serializes)
│   └── worklet/           # AudioWorklet processor
└── api.ts                 # Exports for user code
```

## State Preservation (Re-eval)

When code is re-evaluated, the runtime preserves state:

### Graph Swap Flow

```
1. swapGraph() called with new WorkletStereoGraph
2. diffStereoGraphs() computes nodeMapping (newId → oldId)
3. oldRuntimeGraph.collectStates() returns live state references
4. RuntimeGraph constructor clones states for matched nodes
5. Both graphs run in parallel during 3s crossfade
```

### Deep Clone

`deepCloneState()` handles:
- TypedArrays (Float32Array, etc.) - creates new instances
- Plain objects - recursive clone
- Arrays - map through cloneValue
- Primitives - pass through

This is critical for seq cursor state which contains nested objects.

### WASM State

WASM instances can't be shared (both graphs run simultaneously), so state is serialized:
- `serializeWasmState()` reads state from old instance
- New instance created and initialized
- `deserializeWasmState()` writes state to new instance

## Debugging Tips

1. **Add console.log in toWorkletGraph** to trace what's being serialized
2. **Use JSON.stringify with replacer** to find functions in objects
3. **Check both device.ts and parse-args.ts** when config isn't propagating
4. **Test with simple non-poly case first** to isolate poly issues
