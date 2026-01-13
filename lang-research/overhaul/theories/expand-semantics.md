# Theory: What Does expand() Actually Do?

## Current Contract

```typescript
expand(config, inputBindings) => WrappedNode | WrappedNode[]
```

Called by expandPoly when:
1. Device has `expand` function
2. Either: device is polyphonic, OR device is being processed

## What expand() Does Today

### chord.expand()
- Input: config with root/type
- Creates N chordTone nodes
- Returns: N WrappedNodes

### seq.expand()
- Input: config with pattern
- If pattern has voices (`{a,b,c}`): creates N seq nodes
- Returns: 1 or N WrappedNodes

### spread.expand()
- Input: inputBindings with poly input
- Creates 2 mixer nodes (L/R)
- Returns: 2 WrappedNodes

### pan.expand()
- Input: inputBindings with poly input
- Creates summer + 2 panner nodes
- Returns: 2 WrappedNodes (summer NOT returned - BUG)

## Three Different Operations

Looking at these, expand() does THREE different things:

### 1. Semantic Expansion (chord, seq)
Transform config into multiple outputs.
- Input: mono
- Output: N (from config)
- Nature: "unfold" semantic description

### 2. Stereo Distribution (spread)
Transform N inputs into 2 outputs (L/R).
- Input: N
- Output: 2
- Nature: spatial transformation

### 3. Poly Reduction + Stereo (pan)
Sum N inputs to mono, then distribute to L/R.
- Input: N
- Output: 2
- Nature: reduction + spatial

## Are These the Same Operation?

They all have signature `(config, inputs) → nodes[]`, but:

| Operation | Reads Config | Reads Inputs | Output Count |
|-----------|--------------|--------------|--------------|
| Semantic | Yes (chord type) | No | From config |
| Stereo dist | No | Yes (voice refs) | Always 2 |
| Reduction | No | Yes (voice refs) | Always 2 |

## Hypothesis: Two Different Mechanisms

### "Unfold" - config → N outputs
- Happens to: chord, seq
- When: could be API time or expansion
- Needs: config only
- User might want: `chord.voices[0]`

### "Transform" - N inputs → M outputs
- Happens to: spread, pan
- When: must be expansion (needs input count)
- Needs: resolved inputs
- User doesn't access intermediate voices

## Alternative: Separate Hooks

```typescript
interface DeviceSpec {
  // For config-based expansion (chord, seq)
  unfold?: (config) => Node[]

  // For input-based transformation (spread, pan)
  transform?: (inputs) => Node[]
}
```

Then:
- `unfold` could run at API time
- `transform` must run at expansion time

## What This Would Enable

```javascript
let c = chord(440, "maj")
c.voices[0].saw()  // Works! unfold already happened
c.voices[1].sin()
c.voices[2].tri()
```

vs.

```javascript
let s = saw([220, 330, 440]).spread()
s.voices  // Doesn't exist - spread is a transform, output is stereo
s.left    // Could work - named stereo outputs
s.right
```

## Key Question

**Should semantic expansion happen at API time?**

Pros:
- User can access voices
- Simpler mental model ("what you write is what exists")

Cons:
- How does `seq.clk(clock)` work if seq already expanded?
- Need voice-aware chaining

## Test Case

```javascript
let s = seq("{c4,e4,g4}")  // If unfold at API: 3 seqs exist
s.clk(clock(120))          // Must set clk on all 3

// Option A: clk broadcasts to all voices
s.clk(c)  // Returns poly seq with clock set

// Option B: explicit voice iteration
s.voices.forEach(v => v.clk(c))

// Option C: clk must come BEFORE unfold
seq("{c4,e4,g4}").clk(clock(120))  // clk in initial call, then unfold
```

## Questions

1. Should unfold and transform be separate mechanisms?
2. If unfold is eager, how does setting inputs work?
3. Can stereo outputs (L/R) be first-class instead of array?
