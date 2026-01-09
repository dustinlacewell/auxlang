# Implementation Considerations

How Strudel features map to our eurorack-style architecture.

## The Key Difference

**Strudel**: Pattern → Events → Fixed Synth
- Patterns emit discrete events with property bags
- Synth topology is predetermined
- Everything is event-driven

**Uzulang**: Clock → Seq → CV/Gate → [Any Devices]
- Sequencers output continuous signals
- Arbitrary signal routing
- Mix of discrete (triggers) and continuous (modulation)

## Feature Mapping

### Multiply `*n` ✅ IMPLEMENTED

**Strudel**: `"bd*2"` plays two kicks in the time of one

**Implementation chosen**: Option A - Parse-time expansion

`seq("c3*2")` produces two steps, each with `dur: 0.5` of the original.
- Parser handles `*n` as postfix operator
- Works on notes, rests, and groups: `[c3 e3]*2`
- Bonus: `*<1 2>` alternating multiply also implemented

### Alternation `<a b>` ✅ IMPLEMENTED

**Strudel**: `"<bd sd>"` plays bd first cycle, sd next cycle

**Implementation chosen**: Option C - Parsed AST with cycle info

- Parser produces steps with `cycle` and `cycleTotal` metadata
- Seq process tracks `cycleCount` state, increments on pattern wrap
- `shouldPlay()` helper checks `cycleCount % cycleTotal === step.cycle`
- Works nested inside groups: `[c3 <e3 g3>]`

### Euclidean `(k, n)` ✅ IMPLEMENTED

**Strudel**: `"bd(3,8)"` spreads 3 kicks across 8 slots

**Implementation chosen**: Option A - Parse-time expansion

- Bjorklund algorithm generates boolean pattern
- `seq("c3(3,8)")` expands to 8 steps (notes where hit=true, rests where hit=false)
- Each step has `dur: baseDuration / 8`
- Works on any element: `[c3 e3](3,8)` spreads the group

### Mask (Arrangement)

**Strudel**: `.mask("<0 1 1 1>/16")` - mute for bars 1-4 of every 16

**Uzulang options**:

A) **Gate signal**:
```javascript
let arrangement = seq("~ x x x").slow(16)  // 1 bar on, rest off over 16 bars
let gated = mult(voice).b(arrangement.gate)
```
- Pro: Uses existing primitives
- Con: Need `slow()` or long patterns

B) **Mask device**:
```javascript
let masked = mask(voice).pattern("~ x x x").bars(16)
```
- Pro: Explicit
- Con: New device

C) **Long pattern**: Just write out 16 bars
- Pro: No new features
- Con: Very verbose

### Slow/Fast

**Strudel**: `.slow(2)` plays pattern at half speed

**Uzulang options**:

A) **Clock divider/multiplier**:
```javascript
let slowClk = clockDiv(clk, 2)
seq("c3 e3").trig(slowClk.trig)
```
- Pro: Modular, explicit
- Con: Verbose

B) **Pattern method**: `seq("c3 e3").slow(2)` - but we don't have methods on seq return value
- Con: Architecture change needed

C) **Wrapper function**:
```javascript
let slowSeq = slow(seq("c3 e3"), 2)  // wraps with internal clock div
```
- Pro: Clean-ish
- Con: Hidden clock manipulation

## Implementation Path

### Phase 1: Mini-Notation Expansion ✅ COMPLETE
Added to parser:
- ~~`*n` multiply (subdivide time)~~ ✓
- ~~`<a b>` alternation (cycle-aware)~~ ✓
- ~~`(k,n)` euclidean~~ ✓
- ~~`!n` replicate~~ ✓ (bonus)
- ~~`@n` elongate~~ ✓ (bonus)
- ~~`*<1 2>` alternating multiply~~ ✓ (bonus)

### Phase 2: Clock Tools (NEXT)
Add devices:
- `clockDiv(clock, n)` - divide clock rate
- `clockMult(clock, n)` - multiply clock rate

Enables slow/fast patterns without notation changes.

### Phase 3: Arrangement Tools
Add:
- Long pattern support (already works, just verbose)
- `counter` device - counts triggers, outputs cycle number
- Combine with `scale()` and comparisons for arrangement

### Phase 4: Probability/Random
Add:
- `?` probability notation: `c3?0.5` plays with 50% chance
- `chance(probability)` device - gate that opens randomly
- `pick(a, b, c)` - random selection each trigger
- Already have `noise` + `sah` for continuous random

## Resolved Questions

1. **Should seq track cycles?** YES - seq tracks `cycleCount` in state, increments on pattern wrap. Steps with `cycle`/`cycleTotal` metadata are filtered by `shouldPlay()`.

2. **Pattern vs Clock manipulation?** Hybrid approach: Core operators (`*`, `<>`, `()`) in notation, time stretching via clock tools.

3. **How much notation vs JS?** Notation for pattern structure, JS for routing and sound design. Working well.

## Resolved Questions

4. **Polyphony model?** RESOLVED - All signals are `PolySignal = number[]`. Mono signals are 1-element arrays. Seq outputs `freqs: number[]` for chords. Stack syntax `,` creates polyphonic steps. Processor sums channels for mono output.

## Open Questions

5. **Arrangement beyond mask?** Need to think about song structure - intro/verse/chorus sections. Counter device is a start.
