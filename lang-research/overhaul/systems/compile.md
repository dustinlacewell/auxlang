# System: Compile

Source: `src/core2/runtime/compile.ts`

## Purpose

Converts StereoGraph → StereoRuntimeGraph
The final transformation before sending to AudioWorklet.

## Input/Output

```
StereoGraph {
  nodes: Node[],
  leftOutputIds: NodeId[],
  rightOutputIds: NodeId[]
}
    ↓ compile()
StereoRuntimeGraph {
  nodes: RuntimeNode[],
  leftOutputIds: NodeId[],
  rightOutputIds: NodeId[]
}
```

## What Changes

| Graph Node | Runtime Node |
|------------|--------------|
| `inputs: Record<string, NodeInput>` | `inputSources: Record<string, ResolvedSource>` |
| NodeInput can be array | Arrays should be gone (error if present) |
| Config is same | Config is same |

## ResolvedSource Types

```typescript
type ResolvedSource =
  | { type: "constant", value: number }
  | { type: "connection", nodeId: NodeId, output: string }
  | { type: "lambda", fn: SignalLambda }
```

**Note**: No array type. Arrays should have been resolved by expandPoly.
If array present, throws: "Unexpected array in binding after expansion"

## The Algorithm

1. **Topological sort** - Same Kahn's algorithm as expandPoly (duplicated!)
2. **For each node**:
   - Resolve each input binding to ResolvedSource
   - Create RuntimeNode

## Observations

### Topological Sort Duplication
The exact same topological sort exists in:
- `expand-poly.ts` line 154-208
- `compile.ts` line 80-132

Should this be shared?

### Arrays Are Errors
```typescript
if (Array.isArray(binding)) {
  throw new Error("Unexpected array in binding after expansion");
}
```

This confirms: **By compile time, all poly should be resolved to separate nodes.**

### No Poly Handling
compile.ts has NO poly logic. It expects:
- All nodes already duplicated
- All arrays already resolved to individual connections
- stereo routing already determined

### RuntimeNode vs Node

RuntimeNode adds:
- `inputSources` - resolved to constant/connection/lambda
- Loses: raw `inputs` structure

The device lookup still happens by name at runtime.

## Questions

1. Why duplicate topological sort instead of sharing?
2. What IS RuntimeNode exactly? (need to check runtime-node.ts)
3. Where does process() get called? (AudioWorklet?)
4. Is the stereo routing just passing through IDs?

## Key Insight

**compile.ts is simple because expandPoly did the hard work.**

All poly complexity is handled before compile:
- Voice duplication → done
- Semantic expansion → done
- Stereo distribution → done

compile() just converts data format for runtime.
