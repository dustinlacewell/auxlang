# Current Task

**Port re-evaluation infrastructure to core2**

## Problem

core2 processor creates fresh RuntimeGraphs on each `setStereoGraph` message, losing all state. V1 has seamless re-evaluation with:

1. Topology hash matching (nodes matched by device + connections, not config)
2. State collection/transfer between matched nodes
3. WASM state serialization (filter, reverb, delay preserve buffers)
4. Crossfade between old and new graphs

## What to Port

From `src/runtime/`:
- `processor/topology-hash.ts` - diffGraphs() for node matching
- `processor/runtime-graph.ts` - collectStates(), restoreStates(), deepCloneState()
- `worklet/processor.ts` - serializeWasmState(), deserializeWasmState(), crossfade logic

## Current core2 Processor

```typescript
// src/core2/runtime/worklet/processor.ts
private handleMessage(message: WorkletMessage): void {
  if (message.type === "setStereoGraph") {
    // BAD: creates fresh graphs, loses all state
    this.leftGraph = new RuntimeGraph(message.stereo.left);
    this.rightGraph = new RuntimeGraph(message.stereo.right);
  }
}
```

## Target

```typescript
private handleMessage(message: WorkletMessage): void {
  if (message.type === "setStereoGraph") {
    // 1. Match new nodes to old by topology
    // 2. Collect state from old (including WASM)
    // 3. Create new RuntimeGraphs
    // 4. Restore state to matched nodes
    // 5. Set up crossfade
  }
}
```

## Files to Create/Modify

- `src/core2/runtime/topology-hash.ts` - port from v1
- `src/core2/runtime/worklet/processor.ts` - add re-eval logic
