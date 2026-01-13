# Re-evaluation Performance Optimization

## Problem

Audio crackling during playback and crossfade. Measured data shows:
- Single graph: 2-3ms per 128-sample buffer (budget: 2.9ms) - borderline
- Crossfade (2 graphs): 4-6ms per buffer - way over budget

Root cause: **Object allocation per sample per node.**

## Critical Finding: Allocation-Heavy Process Functions

Every device's `process()` returns a new object:
```typescript
process(inp, cfg, state, sampleRate) {
  // ...
  return { cv: value };  // NEW OBJECT EVERY SAMPLE
}
```

With 52 nodes × 128 samples = **6,656 object allocations per buffer**.
This causes massive GC pressure and is the primary bottleneck.

## Current Pipeline

```
useCore2Audio.play()
  ↓
evalToStereo(code)        ← ALL BLOCKING
  ├── reset()
  ├── runCode(code, api)  ← new Function() every time
  ├── collect()
  ├── expandPoly()        ← O(n²) topological sort
  ├── compile()           ← O(n²) topological sort AGAIN
  └── toWorkletStereoGraph()  ← function.toString() for every node
      ↓
postMessage(stereo)       ← finally async
```

## Bottlenecks (Priority Order)

### 1. CRITICAL: `new Function()` on every re-eval

```typescript
// run-code.ts
const fn = new Function(...Object.keys(api), code);
fn(...Object.values(api));
```

**Fix**: Cache the compiled function by code string hash.

```typescript
const fnCache = new Map<string, Function>();

function getOrCompile(code: string, api: Record<string, unknown>): Function {
  const cached = fnCache.get(code);
  if (cached) return cached;

  const fn = new Function(...Object.keys(api), code);
  fnCache.set(code, fn);
  return fn;
}
```

### 2. HIGH: Topological sort runs TWICE

`expandPoly()` and `compile()` both run O(n²) Kahn's algorithm on the same graph.

**Fix**: Sort once in `expandPoly()`, pass sorted order to `compile()`.

### 3. HIGH: Inefficient topological sort

Current implementation (expand-poly.ts lines 210-220):

```typescript
for (const other of nodes) {
  if (deps.get(other.id)?.has(id)) {
    // O(n²) - checks every node on every pop
  }
}
```

**Fix**: Build reverse adjacency list upfront:

```typescript
// Build once: who depends on whom
const dependents = new Map<NodeId, Set<NodeId>>();
for (const [nodeId, nodeDeps] of deps) {
  for (const depId of nodeDeps) {
    if (!dependents.has(depId)) dependents.set(depId, new Set());
    dependents.get(depId)!.add(nodeId);
  }
}

// Then O(n+e) iteration
while (queue.length > 0) {
  const id = queue.shift()!;
  result.push(nodeById.get(id)!);
  for (const dependent of dependents.get(id) ?? []) {
    // decrement in-degree, add to queue if zero
  }
}
```

### 4. HIGH: Function serialization

```typescript
// to-worklet-graph.ts
processSource = spec.process.toString();
inputs[name] = { type: "lambda", source: source.fn.toString() };
```

Every re-eval calls `.toString()` on every process function and lambda.

**Fix**: Cache serialized source on the device spec / node:

```typescript
// In device factory, compute once
const processSource = spec.process?.toString();
```

### 5. MEDIUM: Topology hash string operations

```typescript
// topology-hash.ts
return `[${connectionHashes.join(",")}]`;  // Creates garbage strings
```

**Fix**: Use numeric hash (FNV-1a or similar) instead of string concat:

```typescript
function hashInput(input: WorkletInput, nodeHashes: Map<string, number>): number {
  let hash = 2166136261; // FNV offset basis
  // ... mix in type, value, connections
  return hash >>> 0;
}
```

### 6. MEDIUM: Node ID string allocation in poly expansion

```typescript
const newId = `${node.id}.${v}`;  // Many garbage strings for high polyphony
```

**Fix**: Use interned ID factory or numeric suffix:

```typescript
const newId = internNodeId(node.id, v);  // Returns cached string
```

### 7. LOW: Double input resolution pass

`resolveVoiceRefs()` and `resolveOutputRefs()` both iterate all inputs.

**Fix**: Combine into single pass.

## Implementation Plan

### Phase 1: Quick Wins (Low Risk)

1. Cache `new Function()` by code string
2. Eliminate redundant topological sort in `compile()`
3. Cache `process.toString()` on device specs

### Phase 2: Algorithm Fixes

4. Fix topological sort to O(n+e) with reverse adjacency
5. Combine VoiceRef + OutputRef resolution into single pass

### Phase 3: Allocation Reduction

6. Switch topology hashing to numeric FNV-1a
7. Intern node ID strings in poly expansion

## Expected Impact

| Fix | Time Saved | Complexity |
|-----|------------|------------|
| Cache Function | ~5-10ms | Easy |
| Remove 2nd toposort | ~1-5ms | Easy |
| Cache toString() | ~2-5ms | Easy |
| O(n+e) toposort | ~1-10ms (scales) | Easy |
| Numeric hashing | ~1-2ms | Medium |
| String interning | ~0.5-2ms | Medium |

**Total expected improvement**: 10-35ms per re-eval for complex patches.

With 128-sample buffer at 44.1kHz, we have ~2.9ms per audio callback. Currently the main thread blocks for 10-70ms during re-eval, causing multiple buffer underruns. Reducing to <5ms would eliminate most crackling.

## Metrics to Track

Before implementing, add timing:

```typescript
console.time('runCode');
runCode(code, api);
console.timeEnd('runCode');

console.time('expandPoly');
const expanded = expandPoly(graph);
console.timeEnd('expandPoly');

// etc.
```
