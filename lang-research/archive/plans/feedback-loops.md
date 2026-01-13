# Plan: Lambda Feedback Loops

## Goal

Enable feedback loops via lambda inputs, kabelsalat-style:

```javascript
saw(110)
  .add(x => x.delay(0.1).mult(0.8))  // x = output of add
  .out()
```

The lambda parameter `x` represents "the output of the node receiving this input", creating a cycle.

## Current State

**Architecture blockers:**
- Descriptors form a DAG - no cycles allowed
- `reify()` does depth-first traversal with `visited` set (skips revisits)
- Runtime processes nodes in topological order, reading current-sample outputs
- No previous-sample storage for feedback

**Kabelsalat approach:**
- Functions detected in `parseInput()`, executed with node reference
- Source/output register pairs provide 1-sample delay naturally
- Cycles handled at compile time, feedback reads from "previous sample" source register

## Design

### Layer 1: Descriptor - Detect Lambda Inputs

When an input binding is a function, create a **FeedbackRef** placeholder:

```typescript
// New type in types.ts
interface FeedbackRef {
  readonly _feedback: true;
  readonly targetId: DescriptorId;  // The node whose output feeds back
  readonly outputName: string;
}

// In device.ts createDescriptor()
if (typeof value === "function") {
  // Create a proxy that acts like this descriptor's output
  const selfRef = createFeedbackProxy(id, spec.defaultOutput);
  // Execute lambda with the proxy
  const result = value(selfRef);
  // Store the result as the input binding
  inputBindings[key] = resolveToSignal(result);
}
```

The `createFeedbackProxy()` returns an object that:
- Has `descriptorId` and `outputName` like an OutputRef
- Is marked with `_feedback: true`
- Chains to devices (via Uzu) returning new FeedbackRefs

### Layer 2: Reification - Mark Feedback Edges

In `reify()`, detect FeedbackRef inputs:

```typescript
function resolveInput(signal, visitDependency): ResolvedInput {
  // ... existing cases ...

  if (isFeedbackRef(signal)) {
    // Don't visit as dependency (would cause cycle)
    return {
      type: "feedback",
      nodeId: signal.targetId,
      output: signal.outputName,
    };
  }
}
```

Graph output includes feedback edges:
```typescript
interface Graph {
  nodes: GraphNode[];
  outputNodeId: string;
  feedbackEdges: FeedbackEdge[];  // NEW: list of (sourceNode, targetNode, output)
}
```

### Layer 3: Runtime - Previous Sample Buffer

In `RuntimeGraph`, add per-node previous sample storage:

```typescript
// In RuntimeNode
previousOutputs: Record<string, number>;  // Last sample's outputs

// In processSample()
// BEFORE processing: copy current outputs to previous
for (const node of this.nodes) {
  for (const outName of node.outputNames) {
    node.previousOutputs[outName] = node.outputRecord[outName];
  }
}

// During input resolution
if (binding.type === "feedback") {
  const sourceNode = this.nodes[binding.sourceNodeIndex];
  // Read PREVIOUS sample, not current
  value = sourceNode.previousOutputs[binding.outputName] ?? 0;
}
```

### Layer 4: Execution Order

Feedback doesn't break topological order because:
- Feedback edges read from **previous sample** (inherent 1-sample delay)
- Non-feedback edges read from **current sample**
- Standard topological sort ignores feedback edges

The existing reify DFS works - feedback refs don't trigger `visit()`.

## Critical Files

| File | Changes |
|------|---------|
| `src/descriptor/types.ts` | Add `FeedbackRef` type |
| `src/descriptor/device.ts` | Detect function inputs, create feedback proxy |
| `src/graph/types.ts` | Add `feedback` ResolvedInput type |
| `src/graph/reify.ts` | Handle FeedbackRef in `resolveInput()` |
| `src/runtime/processor/runtime-graph.ts` | Add `previousOutputs`, feedback resolution |
| `src/runtime/processor/types.ts` | Update `CompiledInput` for feedback |

## Implementation Steps

### Step 1: FeedbackRef Type & Proxy
- Add `FeedbackRef` interface to types.ts
- Add `isFeedbackRef()` type guard
- Create `createFeedbackProxy()` that returns chainable feedback ref

### Step 2: Lambda Detection in Descriptors
- In `createDescriptor()`, check if input value is function
- Execute with feedback proxy, store result

### Step 3: Reification Support
- Add `feedback` case to `ResolvedInput` union
- Handle in `resolveInput()` without visiting dependency
- Track feedback edges in graph output

### Step 4: Runtime Execution
- Add `previousOutputs` to `RuntimeNode`
- Copy outputs before each sample
- Resolve feedback inputs from previous sample

### Step 5: Serialization
- Update `CompiledInput` type for feedback
- Serialize feedback edges in compiled graph

## Example Usage

```javascript
// Feedback delay
saw(110)
  .add(x => x.delay(0.1).mult(0.8))
  .out()

// FM feedback
osc(440).apply(carrier =>
  carrier.add(x =>
    x.mult(0.5)
     .osc()
     .mult(100)
  )
).out()

// Karplus-Strong
noise()
  .add(x => x.delay(1/440).lpf({ cutoff: 2000 }).mult(0.99))
  .mult(impulse(2).env({ attack: 0.001, release: 0.1 }))
  .out()
```

## Testing

### Unit Tests
- `device.test.ts`: Lambda input creates FeedbackRef
- `reify.test.ts`: Feedback edges don't cause infinite recursion
- `runtime-graph.test.ts`: Previous sample reads work correctly

### Interactive Tests
- `fx-feedback-delay.ts`: Basic feedback delay
- `fx-feedback-karplus.ts`: Karplus-Strong pluck
- `fx-feedback-fm.ts`: FM feedback synthesis

### Manual Verification
1. `pnpm dev` - open test suite
2. Play feedback delay test - should hear echoing decay
3. Play karplus test - should hear plucky string sound
4. Verify no infinite loops or crashes

## Risks & Mitigations

**Risk**: Feedback amplitude explosion
- Mitigation: Document that feedback multiplier should be < 1
- Consider: Optional clip/limit on feedback paths?

**Risk**: Poly + feedback interaction
- Mitigation: Test poly with feedback thoroughly
- Each voice maintains independent previous sample buffer

**Risk**: Performance impact of previousOutputs copy
- Mitigation: Only allocate previousOutputs for nodes that are feedback targets
- Track which nodes are targets during reification

## Open Questions

1. Should feedback work through poly boundaries? (voice 0 feeds back to voice 1?)
2. Should we provide a `feedback()` device as explicit alternative to lambda?
3. How to handle feedback in graph diffing for live reeval?
