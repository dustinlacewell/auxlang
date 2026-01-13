# Theory: When Is Voice Count Known?

## The Core Question

At what point in the pipeline does each device know how many voices it deals with?

## Voice Count Sources

### Static (known at API time)
- `saw([220, 330])` - array literal = 2
- `chord(440, "maj")` - chord type = 3
- `seq("{c4,e4,g4}")` - pattern syntax = 3

### Dynamic (known only at expansion)
- `spread(upstream)` - count = upstream voice count
- `lpf(upstream)` - count = upstream voice count
- `gain(upstream)` - count = upstream voice count

## The Dependency Chain

```
saw([220,330])  →  lpf  →  spread  →  out
    ↓               ↓        ↓         ↓
 2 (static)    2 (inherit)  2→2    2 (inherit)
```

Voice count flows FORWARD through the graph.

## Current Implementation

1. API time: Arrays stored in inputs, no expansion
2. expandPoly: Walk graph, track `nodeMap: NodeId → NodeId[]`
3. For each node, check `getUpstreamVoiceCount(inputs, nodeMap)`

## Alternative: Eager Propagation

What if voice count propagated at API time?

```typescript
let voices = saw([220, 330])  // voices.voiceCount = 2
let filtered = voices.lpf(800)  // filtered.voiceCount = 2 (inherited)
```

### Pros
- User can inspect voice count
- `spread` knows count immediately
- Could validate mismatches early

### Cons
- Descriptor would need voiceCount field
- What about `saw(lfo())` where lfo is mono? Count = 1
- What about `saw(poly.cv)` where poly hasn't been created yet?

## Alternative: Lazy with Metadata

Descriptors carry "voice count intent":
- `saw([220,330])` → `{ voiceCount: 2 }`
- `saw(440)` → `{ voiceCount: 1 }`
- `saw(someRef)` → `{ voiceCount: "inherit" }`

At expansion, resolve "inherit" by walking graph.

## Test: What breaks with eager expansion?

```javascript
let s = seq("{c4,e4,g4}")  // If eager: creates 3 seqs immediately
s.clk(clock(120))  // How does clk get set on all 3?
```

Current system: seq is ONE node with pattern config. Expansion creates 3 later.

Eager system: Need to expand seq THEN set clk on all voices.

This requires voices to be accessible: `s.voices.forEach(v => v.clk(c))`

Or chaining broadcasts: `s.clk(c)` sets on all voices automatically.

## Key Insight

The challenge is: **some devices expand based on CONFIG, others based on INPUT**.

- `chord` expands based on chord type (config)
- `spread` transforms based on input count

These are fundamentally different:
- Config-based: can expand at API time
- Input-based: must wait for input to be known

## Hybrid Approach?

What if:
- Config-based expansion happens at API time (chord, seq)
- Input-based transformation happens at build time (spread, pan)

Then `chord.voices[0]` works, but `spread` still defers.

## Questions

1. Are config-based expanders the ONLY ones users want voice access to?
2. Can we separate "creates voices" from "transforms voices"?
3. What if spread/pan aren't "expanders" but "terminators" (stereo endpoints)?
