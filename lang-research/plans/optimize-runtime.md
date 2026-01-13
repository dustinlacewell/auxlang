# Runtime Performance Optimization

**Status: IMPLEMENTED** - All devices updated to use pre-allocated output objects.

## Measured Problem

| Scenario | Time/Buffer | Budget | Status |
|----------|-------------|--------|--------|
| Single graph (52 nodes) | 2-3ms | 2.9ms | Borderline |
| Crossfade (104 nodes) | 4-6ms | 2.9ms | Failing |

## Root Cause

Every device's `process()` allocates a new object per sample:

```typescript
// Current - 6,656 allocations per buffer (52 nodes × 128 samples)
process(inp, cfg, state, sr) {
  return { cv: value };
}
```

## Proposed Fix

Change signature to write to pre-allocated output object:

```typescript
// Zero allocations
process(inp, cfg, state, sr, out) {
  out.cv = value;
}
```

## Implementation

### 1. Update ProcessFn type

```typescript
// Before
type ProcessFn = (inp, cfg, state, sr, time) => Record<string, number>;

// After
type ProcessFn = (inp, cfg, state, sr, time, out: Record<string, number>) => void;
```

### 2. Update runtime-graph.ts hot path

```typescript
// Before
const result = node.process(node.inputs, node.config, node.state, sr, time);
for (const key in result) {
  node.outputs[key] = result[key]!;
}

// After
node.process(node.inputs, node.config, node.state, sr, time, node.outputs);
```

### 3. Update all devices (~30 files)

Each device changes from:
```typescript
process(inp, cfg, state, sr) {
  const value = /* compute */;
  return { cv: value };
}
```

To:
```typescript
process(inp, cfg, state, sr, time, out) {
  out.cv = /* compute */;
}
```

### 4. Update processAll similarly

Same pattern for `processAll` devices.

## Files to Modify

**Core types:**
- `src/core2/device/process-fn.ts` - ProcessFn signature
- `src/core2/device/device-spec.ts` - DeviceSpec type
- `src/core2/runtime/worklet/graph/node/types.ts` - RuntimeNode types

**Runtime:**
- `src/core2/runtime/worklet/graph/runtime-graph.ts` - hot path
- `src/core2/runtime/worklet/graph/node/hydrate-process.ts` - WASM wrapper

**Devices (all ~30):**
- `src/core2/devices/*.ts`

## Expected Impact

- Eliminate ~6,656 allocations per buffer
- Single graph: 2-3ms → ~1ms (estimate)
- Crossfade: 4-6ms → ~2ms (estimate)
- Should comfortably handle 100+ nodes

## Risks

- Breaking change to device API
- All devices must be updated atomically
- Tests will fail until all devices updated

## Alternative: Tuple Return

Could return `[value]` instead of `{cv: value}` but:
- Still allocates (array)
- Loses named outputs
- Doesn't solve multi-output devices

The pre-allocated output object is the cleanest solution.
