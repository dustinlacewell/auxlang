# Pickup Letter

## What Was Accomplished This Session

Continued systematic research. Moved from problem mapping to theory generation and testing.

### The Winning Architecture: Deferred Expansion + VoiceRef

1. **Deferred expansion** - Arrays in inputs stay as arrays until expansion pass. Current model works.

2. **VoiceRef** - Symbolic reference `{ source, index, output? }` for voice access WITHOUT eager expansion.
   ```javascript
   let c = chord(440, "maj")  // Single descriptor
   c.voices[0]                // VoiceRef { source: c.id, index: 0 }
   c.voices[0].saw()          // Descriptor with VoiceRef as input
   ```
   Resolved at expansion time by picking from nodeMap.

3. **Uniform device API** - ALL devices work identically: chaining, positional args, method setters. No special cases.

### poly() Is Just a Device

```typescript
const poly = device("poly", {
  inputs: inputs({ input: 0 }),
  outputs: ["signal"],
  defaultInput: "input",
  defaultOutput: "signal",
  process(inp) { return { signal: inp.input as number }; },
});
```

Array input → expansion duplicates it → downstream sees poly. Chains normally. Nothing special.

### Bugs Found (Implementation, Not Architecture)

| Bug | Cause | Fix |
|-----|-------|-----|
| Pan internal node | expand() doesn't return sumNode | Track all nodes created during expand() |
| Spread/pan runtime | Closure capture lost in serialization | Use config instead of closure |

### Key Research Files

```
analysis/
├── trace-summary.md              ← What works/doesn't
├── comprehensive-trace.md        ← Full VoiceRef walkthrough
├── device-implementation-details.md  ← poly() explained
├── device-author-api.md          ← Device categories
theories/
├── lazy-voice-refs.md            ← The winning approach
├── signal-vs-structure.md        ← Mono vs poly thinking
```

## Next Topic: Do We Need Mono/Poly Distinction At All?

The current architecture assumes:
- **Cables are mono** (scalar signals at runtime)
- **Poly = graph duplication** (saw([220,330]) → 2 saw nodes)

VCV Rack takes opposite approach:
- **All cables are polyphonic** (up to 16 channels per cable)
- **Modules process all channels** (no graph duplication)

### Questions to Explore

1. **Do we need mono/poly distinction?**
   - Current: NodeInput can be scalar OR array, requires expansion pass
   - Alternative: Everything is poly, mono is just width-1

2. **What are the tradeoffs?**
   - Graph duplication: More nodes, simpler process()
   - Poly cables: Fewer nodes, every process() handles arrays

3. **What would "all cables poly" look like?**
   - No expansion pass?
   - process() always receives arrays?
   - How does spread/pan work?

4. **Is graph duplication actually right for us?**
   - We compile to AudioWorklet which processes sample-by-sample
   - SIMD not available in worklets (yet?)
   - Graph duplication matches runtime reality

### Why This Matters

The mono/poly distinction creates complexity:
- Arrays need special handling in inputs
- VoiceRef exists to access individual voices
- Expansion pass does graph transformation
- `polyphonic` flag controls behavior

If we eliminated the distinction, would complexity decrease or just move elsewhere?

## Starting Point for Next Session

1. Read `theories/signal-vs-structure.md` - early thinking on this
2. Read `analysis/trace-summary.md` - current model summary
3. Investigate: What would VCV-style poly look like? Would it be simpler or just different?
