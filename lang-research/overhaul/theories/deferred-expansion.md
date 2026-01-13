# Theory: Deferred Expansion (Current System, Fixed)

## The Idea

Keep expansion deferred, but fix the bugs and clarify the model.

## Current Flow

```
API time: Descriptors with arrays in inputs
    ↓
collect(): FlatGraph { nodes: Node[] }
    ↓
expandPoly(): StereoGraph { nodes: Node[], L/R outputs }
    ↓
compile(): RuntimeGraph
```

## What Would Change

### Fix 1: Internal nodes must be collected

expand() can return nodes that reference other nodes it created.
collectExpandedNodes must walk the graph, not just take returned nodes.

```typescript
function collectExpandedNodes(result) {
  const returned = Array.isArray(result) ? result : [result];
  const all = new Set<Node>();

  function walk(node) {
    if (all.has(node)) return;
    all.add(node);
    for (const input of Object.values(node.inputs)) {
      if (isInternalRef(input)) walk(findNode(input.ref));
    }
  }

  for (const node of returned) walk(node);
  return [...all];
}
```

### Fix 2: Anonymous device IDs must be stable

Currently `_anon${++counter}` races with expansion order.
Need predictable IDs for anonymous devices.

### Fix 3: Clarify polyphonic flag

Rename to `consumesPoly: true` - clearer meaning.

## Testing Against Requirements

### R1: Poly from arrays ✓
```javascript
saw([220, 330])  // Array stored, expanded later
```

### R2: Poly from semantics ✓
```javascript
chord(440, "maj")  // expand() creates voices during expansion
```

### R3: Poly propagation ✓
```javascript
saw([220, 330]).lpf(800)  // expandPoly duplicates lpf
```

### R4: Stereo distribution ✓
```javascript
poly.spread()  // spread.expand() creates L/R mixers
```

### R5: Mono modulation ✓
```javascript
saw([220, 330]).lpf(lfo())  // lfo stays mono, broadcast to both
```

### R6: Per-voice modulation ✓
```javascript
saw([220, 330]).lpf([800, 1200])  // Array distributed per voice
```

### R7: Fluent chaining ✓
Works today.

### R8: Output access ✓
Works today.

### R9: Voice access ✗
```javascript
let c = chord(440, "maj")
c.voices[0]  // FAILS - expansion hasn't happened
```

Cannot support without eager expansion.

## Evaluation

### Pros
- Minimal changes to existing system
- Just fix bugs, clarify naming
- Dynamic patterns work naturally

### Cons
- Voice access (R9) impossible
- Expansion pass remains complex
- Two mental models (API vs expanded)

### Verdict

**Workable but limited.** If R9 (voice access) isn't required, this is fine.

If R9 is important, deferred expansion cannot satisfy it.

## Key Question

**Is R9 actually required?**

Use cases for voice access:
- Different processing per voice
- Routing specific voices differently
- Debugging ("what's voice 2 doing?")

Can these be achieved without API-time voice access?

### Alternative: Voice selection device

```javascript
chord(440, "maj").pick(0).saw()  // pick() selects voice, works post-expansion
```

But this still can't do:
```javascript
c.voices[0].saw()
c.voices[1].tri()  // Different waveshape per voice
```

Would need:
```javascript
chord(440, "maj").apply(voices => [
  voices[0].saw(),
  voices[1].tri(),
  voices[2].sqr()
])  // apply() callback receives expanded voices
```

Clunky but possible. Is this acceptable?

## Conclusion

Deferred expansion can be fixed and clarified, but cannot provide API-time voice access.

Whether to keep deferred or switch to eager depends on whether R9 is a hard requirement.
