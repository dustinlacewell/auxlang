# System: Runtime Execution

How the graph becomes executable audio.

## Pipeline After Expansion

```
StereoGraph
    ↓ compile()
StereoRuntimeGraph { nodes: RuntimeNode[], leftOutputIds, rightOutputIds }
    ↓ toWorkletStereoGraph()
WorkletStereoGraph { specs, nodes: WorkletNode[], leftOutputIds, rightOutputIds }
    ↓ postMessage to AudioWorklet
AudioWorklet processes samples
```

## Key Types

### RuntimeNode
```typescript
interface RuntimeNode {
  id: NodeId;
  device: string;
  inputSources: Record<string, ResolvedSource>;
  config: Record<string, ConfigValue>;
}
```

### ResolvedSource
```typescript
type ResolvedSource =
  | { type: "constant"; value: number }
  | { type: "connection"; nodeId: NodeId; output: string }
  | { type: "lambda"; fn: SignalLambda }
```

**Key point**: No arrays. By runtime, all poly has been resolved to individual connections.

### WorkletNode
Same as RuntimeNode but with serialization:
- Lambda functions → source strings
- Config functions → source strings
- WASM devices → wasmBytes included

## compile.ts → StereoRuntimeGraph

1. Topological sort nodes (again - duplicated from expandPoly)
2. For each node, resolve inputs:
   - number → `{ type: "constant", value }`
   - OutputRef → `{ type: "connection", nodeId, output }`
   - SignalLambda → `{ type: "lambda", fn }`
   - Array → **ERROR** ("run expandPoly first")

## toWorkletStereoGraph.ts → WorkletStereoGraph

1. Collect unique DeviceSpecs
2. Serialize process functions to strings
3. Fetch any WASM modules
4. Convert RuntimeNodes to WorkletNodes (serialize lambdas/config)

## SignalLambda

```typescript
type SignalLambda = (
  state: Record<string, unknown>,
  sampleRate: number,
  time: number
) => number;
```

- Per-sample inline function
- Has persistent `state` object
- Receives `sampleRate` and `time`
- Returns a single number

**Poly interaction**: Unknown - needs investigation. Can lambdas be poly?

## The Execution Flow

```
User code: saw((s, sr, t) => 200 + t * 50).out()

API Phase:
  → Node { inputs: { freq: [Function] } }

Expansion Phase:
  → Node unchanged (lambda is not poly)

Compile Phase:
  → RuntimeNode { inputSources: { freq: { type: "lambda", fn } } }

WorkletGraph Phase:
  → WorkletNode { inputs: { freq: { type: "lambda", source: "..." } } }

AudioWorklet:
  → Hydrates function from source string
  → Calls fn(state, sampleRate, time) per sample
```

## Stereo Routing

`leftOutputIds` and `rightOutputIds` specify which out nodes go to which channel.

At expansion time:
- Out nodes distributed round-robin (even→L, odd→R)
- Or spread/pan devices explicitly create L/R outputs

At runtime:
- AudioWorklet sums all leftOutputIds for left channel
- AudioWorklet sums all rightOutputIds for right channel

## Observations

1. **Topological sort done twice**: Once in expandPoly, once in compile. Could share.

2. **Arrays are errors at compile**: The compile phase validates that expansion happened.

3. **Serialization boundary**: Functions become strings crossing to AudioWorklet.

4. **WASM support**: Devices can have `wasmUrl` for native DSP code.

5. **No poly at runtime**: All voice handling is structural (node duplication), not signal-based.

## Questions

1. What happens if a SignalLambda is used in a poly context? (e.g., `saw([lambda, lambda])`)
2. How are WASM devices instantiated in the worklet?
3. What's the actual sample processing loop look like?
