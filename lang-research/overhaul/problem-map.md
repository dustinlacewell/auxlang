# Problem Map: Core2 Poly Expansion Architecture

A comprehensive map of the poly expansion problem space.

---

## Executive Summary

The core2 audio DSL has a polyphony system that:
1. Allows users to write `saw([440, 550])` for 2-voice output
2. Allows devices to expand semantically (`chord("maj")` → 3 tones)
3. Allows devices to transform topology (`spread` → L/R stereo)

The system is **mostly working** but has:
- One node registration bug (callable syntax)
- Conflated concerns in expansion (4 operations in 328 lines)
- Unclear naming (`polyphonic` really means "stereo output device")

---

## The Three Patterns

After analyzing all devices, there are really only **3 poly patterns**:

### Pattern 1: Normal Devices (95% of devices)
- No special flags
- Duplicated when upstream is poly
- `saw([440, 550]).lpf()` → lpf duplicated to lpf.0, lpf.1

### Pattern 2: Semantic Expanders (chord, seq)
- Have `expand()` hook, NOT `polyphonic`
- Create N nodes from config
- `chord("maj")` → 3 chordTone nodes
- Then behave like Pattern 1 for downstream

### Pattern 3: Stereo Reducers (spread, pan)
- Have `polyphonic: true` AND `expand()`
- Consume N voices, output exactly 2 (L/R)
- This is the ONLY use of `polyphonic` flag

---

## System Pipeline

```
USER CODE: saw([440, 550]).lpf(800).spread().out()
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 1: API EXECUTION                                          │
│                                                                 │
│ saw([440,550]) → Node{id:"saw1", inputs:{freq:[440,550]}}      │
│ .lpf(800)      → Node{id:"lpf2", inputs:{input:{ref:"saw1"}}}  │
│ .spread()      → Node{id:"spread3", inputs:{input:{ref:"lpf2"}}}│
│ .out()         → Node{id:"out4", inputs:{input:{ref:"spread3"}}}│
│                                                                 │
│ Output: FlatGraph with 4 nodes, poly encoded in inputs         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 2: POLY EXPANSION (expandPoly)                            │
│                                                                 │
│ Topologically process each node:                                │
│                                                                 │
│ saw1:    has [440,550] → duplicate to saw1.0, saw1.1           │
│ lpf2:    upstream=2    → duplicate to lpf2.0, lpf2.1           │
│ spread3: polyphonic    → DON'T duplicate, call expand()        │
│          expand creates: _anon1 (leftMixer), _anon2 (rightMixer)│
│ out4:    upstream=2    → duplicate to out4.0, out4.1           │
│                                                                 │
│ Final: 8 nodes, stereo routing determined                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ PHASE 3: COMPILATION                                            │
│                                                                 │
│ Convert Node → RuntimeNode                                      │
│ Resolve inputs to ResolvedSource (constant/connection/lambda)   │
│ Pass through stereo routing IDs                                 │
│                                                                 │
│ Output: Executable graph for AudioWorklet                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Confirmed Device Inventory

| Category | polyphonic | expand | Devices |
|----------|------------|--------|---------|
| Normal | ✗ | ✗ | osc, sin, saw, tri, sqr, noise, lpf, hpf, bpf, notch, gain, delay, reverb, tape, slew, sah, adsr, ar, ad, scale, add, mix, clock, clockDiv, clockMult, counter, pick, quantize, out |
| Semantic Expander | ✗ | ✓ | chord, seq |
| Stereo Reducer | ✓ | ✓ | spread, pan |
| (unused) | ✓ | ✗ | (none) |

---

## Node Creation Matrix

| How Created | Uses | Registers | Example |
|-------------|------|-----------|---------|
| Named device factory | `createDeviceNode` | ✓ | `saw(440)` |
| Anonymous device factory | `createNode` | ✗ | `chordTone(...)` in expand |
| Input setter `.freq()` | `createDeviceNode` | ✓ | `node.freq(440)` |
| Chaining `.lpf()` | `createDeviceNode` | ✓ | `node.lpf(800)` |
| Callable `node()` | `createNode` | **✗ BUG** | `node(440)` |

---

## The One Bug

**Location**: wrap.ts line 102-107

```typescript
apply(target, _thisArg, args) {
  const [value] = args;
  const newNode = createNode(...);  // Should be createDeviceNode
  return wrap(newNode);
}
```

The callable syntax `node(440)` creates a node that isn't registered.
If this node is referenced downstream, "Cycle detected" error occurs.

**Fix**: Change to `createDeviceNode(...)` like input setters use.

---

## Information Flow

### What Each Phase Needs

| Phase | Needs | Produces |
|-------|-------|----------|
| API | DeviceSpec (for parsing), Node ID counter | FlatGraph |
| Expansion | All nodes, DeviceSpecs, nodeMap | StereoGraph |
| Compile | Expanded nodes, DeviceSpecs | RuntimeGraph |

### Voice Count Sources

| Source | When Known | Example |
|--------|------------|---------|
| Array literal | API time | `[440, 550]` |
| Semantic expansion | Expand time | `chord("maj")` |
| Upstream propagation | Expand time | via nodeMap |

---

## The polyphonic Flag Clarified

Despite its name, `polyphonic` doesn't mean "handles polyphony".

**What it actually means:**
> "Don't duplicate this device when upstream is poly. Instead, call expand() with the poly inputs."

**Only used by**: spread, pan

**Better name might be**: `stereoOutput` or `noAutoExpand` or `consumesPoly`

---

## Conflated Concerns in expandPoly

The 328-line function does 4 things:

1. **Topological sort** - Pure graph algorithm
2. **Voice duplication** - Mechanical copying
3. **Semantic expansion** - Calling device expand() hooks
4. **Stereo distribution** - Assigning L/R outputs

These COULD be separate passes but are interleaved for efficiency.

---

## Open Design Questions

### Settled Questions

1. ✅ Is poly signal-width or node-count? → **Node count** (arrays become nodes)
2. ✅ What does `polyphonic` mean? → **"Stereo output device"**
3. ✅ How many device patterns? → **Three** (normal, semantic, stereo)

### Remaining Questions

1. Should expand() return Node instead of WrappedNode?
2. Should the callable `node(440)` syntax even exist?
3. Can/should expandPoly be decomposed into passes?
4. How should users access individual voices at API time?

---

## Files Summary

| File | Role | Status |
|------|------|--------|
| graph/node.ts | Node definition | ✓ Understood |
| graph/output-ref.ts | Connection pointer | ✓ Understood |
| signal/node-input.ts | Input types including poly | ✓ Understood |
| device/device-spec.ts | Device blueprint | ✓ Understood |
| graph/graph-builder.ts | Node accumulator | ✓ Understood |
| graph/expand-poly.ts | Expansion logic | ✓ Understood |
| wrap/wrap.ts | Fluent API | ✓ Understood, bug found |
| device/device.ts | Factory creation | ✓ Understood |
| runtime/compile.ts | Final compilation | ✓ Understood |

---

## Research Files Index

```
lang-research/overhaul/
├── directive.md           - Research mission
├── problem-map.md         - This file (summary)
├── ontology.md            - Entity catalog
├── tensions.md            - Design conflicts
├── device-taxonomy.md     - Device categories
├── information-flow.md    - Phase data flow
├── open-questions.md      - Unanswered questions
├── investigation-queue.md - Files to investigate
├── entities/
│   ├── node.md
│   ├── output-ref.md
│   ├── node-input.md
│   ├── device-spec.md
│   └── graph-builder.md
└── systems/
    ├── expand-poly.md
    ├── wrap.md
    ├── node-creation.md
    └── compile.md
```
