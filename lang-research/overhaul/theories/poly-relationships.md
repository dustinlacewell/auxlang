# Theory: Device-Poly Relationships

## The Five Relationships

How can a device relate to polyphony?

| Relationship | Input | Output | Current Support |
|-------------|-------|--------|-----------------|
| **Pass-through** | N | N | ✓ Default (duplication) |
| **Reduce-to-mono** | N | 1 | ✗ No mechanism |
| **Reduce-to-stereo** | N | 2 | ✓ polyphonic + expand |
| **Expand** | 1 | N | ✓ expand hook or arrays |
| **Broadcast** | 1 | 1 | ✓ Mono shared to all |

## Examples

### Pass-through
`saw([220,330]).lpf(800)` → 2 lpfs, one per voice

### Reduce-to-mono
`saw([220,330,440]).sum()` → 1 output (NOT SUPPORTED)

### Reduce-to-stereo
`saw([220,330,440]).spread()` → 2 outputs (L/R)

### Expand
`chord(440, "maj")` → 3 outputs from 1 input

### Broadcast
`saw([220,330]).lpf(lfo())` → Same LFO value to both lpfs

## The Gap

No way to reduce N voices to 1. Current options:
- Reduce to 2 (spread/pan)
- Stay at N (pass-through)

What if you want: `saw([220,330,440]).mix()` → mono sum?

## Hypothesis

The `polyphonic` flag is really about **input consumption**:
- `polyphonic: false` → duplicate me, give each copy one voice
- `polyphonic: true` → don't duplicate, give me ALL voices

But output behavior is separate and determined by `expand()`:
- No expand → same structure as input
- expand returns 2 → stereo output
- expand returns N → poly output

## Test Case: mix

```javascript
saw([220, 330, 440]).mix({ b: sin(880) })
```

Result: 3 mix nodes, each gets 1 saw voice + shared sin.

This is pass-through behavior. But what if we wanted all 3 saws mixed to mono?

Currently impossible without `polyphonic: true` AND an expand that sums.

## Questions

1. Is reduce-to-mono actually needed? Or is stereo always the endpoint?
2. Should `polyphonic` be renamed to `consumesPoly`?
3. Should output count be separate from expand mechanism?
