# Trace Summary: What Works, What Doesn't

## Traces Completed

1. **comprehensive-trace.md** - Full example with VoiceRef
2. **trace-pan-problem.md** - Pan's internal node bug
3. **trace-seq.md** - Seq's pattern expansion and multi-output
4. **trace-spread.md** - Spread's stereo distribution

## What Works

### VoiceRef Model ✓
- `s.voices[0]` returns VoiceRef(source, index)
- VoiceRef can specify output: VoiceRef(source, index, "gate")
- Resolved at expansion time by picking from expanded nodes
- Enables per-voice processing without eager expansion

### Seq Expansion ✓
- Pattern "{c4,e4,g4}" expands to 3 mono seqs
- Each output (cv, gate, trig) accessible
- Chaining broadcasts to all voices
- VoiceRef picks single voice

### Spread ✓
- Receives poly as array of OutputRefs
- Creates L/R mixers with direct voice references
- No internal node bug (no intermediate nodes)
- Works with mono input (center pan)

### Array Propagation ✓
- `saw([220,330])` creates node with array input
- Expansion duplicates downstream devices
- Arrays zip when multiple poly sources

## What Doesn't Work

### Pan Internal Node Bug ✗
- pan.expand() creates sumNode for poly input
- sumNode not returned from expand()
- Downstream nodes reference non-existent ID

**Fix needed:** Track all nodes created during expand(), not just returned ones.

### Spread/Pan Runtime Serialization Bug ✗
- "voiceCount is not defined" error at runtime
- Root cause: `createMixer()` and `createSummer()` capture `voiceCount` in closure
- When process() is serialized via `.toString()`, closure is lost
- Worklet receives function with undefined variable

**Fix needed:** Use config instead of closure capture. See `trace-spread-runtime-bug.md`.

## Fixes Required

### Fix 1: Expand Context Tracking

```typescript
let expandContext: Node[] | null = null;

function runExpand(spec, config, inputs) {
  expandContext = [];
  const result = spec.expand(config, inputs);
  const allCreated = expandContext;
  expandContext = null;
  return { result, allCreated };
}

// In createNode (used by anonymous devices):
function createNode(...) {
  const node = { ... };
  if (expandContext) expandContext.push(node);
  return node;
}
```

collectExpandedNodes uses allCreated instead of just walking returned nodes.

### Fix 2: VoiceRef Type

```typescript
type VoiceRef = {
  type: "voiceRef";
  source: NodeId;
  index: number;
  output?: string;  // default: device's defaultOutput
};

// Add to NodeInput union
type NodeInput = number | OutputRef | OutputRef[] | number[] | SignalLambda | VoiceRef;
```

### Fix 3: VoiceRef Resolution in expandPoly

```typescript
function resolveInputs(inputs, nodeMap) {
  for (const [key, value] of Object.entries(inputs)) {
    if (isVoiceRef(value)) {
      const expandedIds = nodeMap.get(value.source);
      if (!expandedIds) throw new Error(`Source ${value.source} not expanded`);
      if (value.index >= expandedIds.length) {
        throw new Error(`Voice ${value.index} out of range`);
      }
      const targetId = expandedIds[value.index];
      const output = value.output ?? getDefaultOutput(value.source);
      result[key] = { ref: targetId, out: output };
    }
    // ... other cases
  }
}
```

### Fix 4: voices Accessor on Descriptors

```typescript
// In wrap.ts or descriptor creation
function createVoicesAccessor(sourceNode) {
  return new Proxy({}, {
    get(_, prop) {
      const index = Number(prop);
      if (!Number.isNaN(index)) {
        return createVoiceRefProxy(sourceNode.id, index);
      }
    }
  });
}

function createVoiceRefProxy(sourceId, index) {
  return new Proxy({ type: "voiceRef", source: sourceId, index }, {
    get(target, prop) {
      // Output access: .cv, .gate
      if (isKnownOutput(prop)) {
        return { ...target, output: prop };
      }
      // Chaining: .saw(), .lpf()
      const factory = getDeviceFactory(prop);
      if (factory) {
        return (...args) => chainFromVoiceRef(target, prop, args);
      }
    }
  });
}
```

## Architecture Summary

The model is:

1. **API Time**
   - Descriptors created with arrays, OutputRefs, VoiceRefs
   - VoiceRef = symbolic `(source, index, output?)`
   - No expansion yet

2. **Expansion Time**
   - Topological order
   - Array inputs → node duplication
   - expand() hooks → semantic transformation
   - VoiceRef → resolved to OutputRef
   - Track ALL nodes created (fix pan bug)

3. **Compile Time**
   - Nodes → RuntimeNodes
   - No arrays (validated)
   - Ready for worklet

## Resolved Questions

### poly() function
poly() is a regular pass-through device. Array input → expansion duplicates it. Works exactly like every other device (chaining, method setters, etc.). See `device-implementation-details.md`.

## Open Questions

1. **VoiceRef on mono source** - Error or treat as voices[0]?

## All Bugs Found

| Bug | Location | Cause | Fix |
|-----|----------|-------|-----|
| Pan internal node | expand-poly.ts | expand() returns don't include internal nodes | Track all created nodes |
| Spread/pan runtime | spread.ts, pan.ts | Closure capture lost in serialization | Use config instead |

## Verdict

The VoiceRef model works architecturally. Two implementation bugs exist (both fixable without architecture changes):
1. Expand context tracking for internal nodes
2. Config instead of closure for serialized functions
