# Design Tensions

Fundamental conflicts and tradeoffs in the current architecture.

---

## Tension 1: When Does Voice Count Become Known?

### The Conflict

**Some devices know voice count at API time:**
- `saw([440, 550])` - user explicitly provides 2 values
- `chord(440, "maj")` - chord type determines 3 voices

**Some devices need to WAIT:**
- `spread(polyInput)` - needs to count upstream voices
- `lpf(polyInput)` - inherits count from upstream

### The Problem

If we expand everything at API time:
- User can access voices: `chord.voices[0]`
- But `spread` can't know its input count yet

If we expand during build:
- `spread` can count its inputs
- But user can't access individual voices

### Questions

- Can we have PARTIAL expansion at API time?
- What if voice count is metadata that propagates?
- Should devices declare "I produce N voices" vs "I inherit voices"?

---

## Tension 2: Should Expanded Nodes Register?

### The Conflict

**Named device nodes should register:**
- `saw(440)` → node in builder for downstream to reference
- `.lpf(800)` → node in builder for chaining

**Expand-created nodes should NOT register (currently):**
- `chordTone(...)` inside chord.expand → internal implementation
- If registered, they'd be processed by expandPoly again

### The Problem

We have multiple node creation paths:
1. `createDeviceNode` → registers
2. `createNode` → doesn't register
3. Anonymous device factory → doesn't register

But the WRAP layer mixes these:
- Input setter SHOULD register (user-facing)
- Currently uses `createDeviceNode` (fixed recently)
- Callable `node(440)` uses `createNode` (still broken?)

### Questions

- Is "whether to register" a property of the node, the creation path, or the context?
- Should there be ONE creation function with a flag?
- What if builder tracked node origin (user vs expand)?

---

## Tension 3: What Does `polyphonic` Actually Mean?

### The Conflict

The flag is defined as:
> "device handles poly internally instead of being expanded"

But devices use it differently:

**spread/pan**: `polyphonic: true` + `expand`
- Don't duplicate me
- expand() transforms to L/R nodes

**mix**: NOT polyphonic
- Has multiple inputs
- Gets duplicated if any input is poly (is this right?)

### The Problem

"Polyphonic" conflates:
1. Don't duplicate when upstream is poly
2. Process() can handle arrays
3. expand() receives poly inputs

### Questions

- Should we separate "duplicate" from "expand"?
- What if polyphonic meant "I produce same voice count as input"?
- What about devices that REDUCE voice count?

---

## Tension 4: expand() Signature and Return Type

### The Conflict

**Current signature:**
```typescript
expand(config, inputs) => WrappedNode | WrappedNode[]
```

**Why WrappedNode?**
- Allows expand to use device factories
- `chordTone({ root: ... })` returns WrappedNode

**But expandPoly needs plain Node:**
- Has to unwrap via `collectExpandedNodes`
- Extracts { id, device, inputs, config }

### The Problem

expand() wraps, expandPoly unwraps. Why wrap at all?

If expand returned plain Node:
- Cleaner data flow
- But can't use device factories easily

### Questions

- Should expand get a special node creation helper?
- Should device factories have a "raw" mode?
- Is WrappedNode even the right abstraction for expand output?

---

## Tension 5: Graph vs Bag of Nodes

### The Conflict

**FlatGraph is just:**
```typescript
{ nodes: Node[] }
```

**But the structure is a graph:**
- Nodes reference each other via OutputRef
- There are dependencies, cycles possible
- Topological order matters

### The Problem

The "graph" structure is implicit:
- Discovered during topological sort
- Not validated until expansion
- Missing nodes cause cryptic "cycle detected" errors

### Questions

- Should FlatGraph actually be a graph data structure?
- Should connections be validated at API time?
- What if we tracked edges explicitly?

---

## Tension 6: API-Time Access vs Build-Time Knowledge

### The Conflict

**Users want:**
```typescript
let s = seq("{c4,e4,g4}");
s.voices[0].saw()  // access first voice
```

**But expansion happens later:**
- seq's voices are created during expandPoly
- Can't access at API time (node doesn't exist yet)

### The Problem

Two conceptual models conflict:
1. "What you write is what exists" (immediate)
2. "API is intent, build resolves it" (deferred)

Current system is hybrid:
- Some things immediate (node creation)
- Some things deferred (voice expansion)

### Questions

- Can we make it ALL immediate?
- Can we make it ALL deferred?
- Is hybrid inherently unstable?

---

## Summary: The Core Tension

All these tensions stem from ONE fundamental question:

**Is polyphony a property of SIGNALS or STRUCTURE?**

- Signal model: Signals have width/lanes, nodes process all lanes
- Structure model: Poly means multiple nodes

Current system uses structure model:
- Poly = multiple nodes
- Expansion = creating nodes
- Voice count = node count

But it leaks signals thinking:
- NodeInput can be array (signal with lanes)
- But arrays become multiple nodes during expansion

A clean design would commit to one model fully.
