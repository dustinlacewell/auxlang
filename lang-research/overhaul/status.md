# Research Status

## Phase: Theory Evaluation

We've moved from mapping the problem space to evaluating architectural options.

## Completed Research

### Problem Mapping (done)
- [x] Entities documented (Node, DeviceSpec, etc.)
- [x] Systems documented (expandPoly, wrap, node creation)
- [x] Device taxonomy (3 patterns: normal, semantic, stereo)
- [x] Information flow mapped
- [x] Design tensions identified (6 tensions)

### Theory Generation (done)
- [x] Signal vs Structure model analysis
- [x] Eager vs Deferred expansion analysis
- [x] Hybrid expansion theory
- [x] Node creation paths analysis
- [x] expand() semantics breakdown

### Empirical Testing (done)
- [x] Voice count mismatch behavior documented
- [x] pan internal node bug confirmed
- [x] spread working (no internal chains)
- [x] mix duplication behavior documented

## Key Findings

### The Three Poly Operations
1. **Unfold** - config → N voices (chord, seq)
2. **Duplicate** - upstream N → N copies (lpf, gain)
3. **Transform** - N voices → 2 (spread, pan)

### `polyphonic` Flag Meaning
"Don't duplicate me, I consume poly as a whole."
Used by: spread, pan

### Current Bugs
1. pan.expand() doesn't return internal sumNode
2. Runtime hydration error in spread ("voiceCount not defined")

### Viable Architectures
1. **Hybrid** - Eager unfold, deferred transform
2. **Deferred (fixed)** - Current model with bugs fixed

## Blocking Decision

**Is R9 (voice access) required?**

```javascript
let c = chord(440, "maj")
c.voices[0].saw()  // Is this needed?
```

- If YES → Hybrid model (eager unfold)
- If NO → Deferred model (simpler, less change)

## Files Created

### Entities
- `entities/node.md`
- `entities/device-spec.md`
- `entities/output-ref.md`
- `entities/node-input.md`
- `entities/graph-builder.md`

### Systems
- `systems/expand-poly.md` (updated with bug details)
- `systems/wrap.md`
- `systems/runtime.md`

### Theories
- `theories/poly-relationships.md`
- `theories/when-voice-count-known.md`
- `theories/node-creation-paths.md`
- `theories/expand-semantics.md`
- `theories/signal-vs-structure.md`
- `theories/eager-expansion.md`
- `theories/deferred-expansion.md`
- `theories/hybrid-expansion.md`

### Analysis
- `analysis/blocking-decisions.md`
- `analysis/voice-count-mismatch.md`
- `analysis/narrowing.md`

### Other
- `requirements.md`
- `tensions.md`
- `device-taxonomy.md`

## Next Steps

1. Get user input on R9 (voice access requirement)
2. Based on answer, detail the chosen architecture
3. Map implementation steps
