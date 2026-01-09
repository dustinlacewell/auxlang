# Auxlang Context Letter

## What We Built Today

Successfully recreated New Order's "Blue Monday" bass line from Strudel in our auxlang sequencer system, fixing several bugs along the way.

### The Final Blue Monday Pattern

```javascript
let clk = clock(130)

let kSeq = seq("c1!2 [c1*4]!2 c1!4").clk(clk.trig)
let k = kick(kSeq.gate)

let hSeq = seq("[~ c1]").clk(clk.trig)
let h = gain(hihat(hSeq.gate).decay(0.05)).amount(0.4)

let bSeq = seq("[<[[f2 ~] [f2 ~] f2 g2] [[g2 ~] [g2 ~] g2 g2]>@4 [c2 ~] c2 c2 [d2 ~] d2 d2 [d2 ~] d2 d2 [d2 ~] d2 d2]@8").clk(clk.trig)
let bEnv = adsr(bSeq.gate).attack(0.005).decay(0.08).sustain(0.7).release(0.05)
let bass = mult(lpf(saw(bSeq.cv)).cutoff(600)).by(bEnv.out)

return out(mix(k).b(h).c(bass))
```

Original Strudel:
```javascript
stack(
  s("bd!2 [bd*4]!2 bd!4").slow(8).bank("SequentialCircuitsDrumtracks"),
  s("~ hh").bank("SequentialCircuitsDrumtracks"),
  n("<[[2 ~] [2 ~] 2 3] [[3 ~] [3 ~] 3 3]>@4 [-1 ~] -1 -1 [0 ~] 0 0 [0 ~] 0 0 [0 ~] 0 0").slow(8).scale("d2:minor").s("gm_lead_8_bass_lead")
).cpm(130)
```

## Bugs Fixed

### 1. Mix Device Clipping
**Problem:** `mix` just summed signals, causing clipping with multiple inputs.
**Fix:** Added `1/sqrt(n)` scaling where n = number of active inputs.
**File:** `src/devices/mix.ts`

### 2. Duplicate Traverse Code
**Problem:** There are TWO copies of the sequencer traverse logic:
- `src/devices/seq/expr/traverse.ts` - used by tests and direct imports
- `src/runtime/worklet/seq-traverse.ts` - used by the actual audio worklet

Changes to one didn't affect the other, so tests would pass but audio would be wrong.

**Lesson:** When debugging, check if code is duplicated for worklet contexts.

### 3. Group Weighting for `@` Modifier
**Problem:** `traverseGroup` divided duration equally among children, ignoring `@` weights.
**Fix:** Changed to weight children by `countBeats()`:

```typescript
// Old (equal division)
const childDuration = ctx.duration / children.length;

// New (weighted division)
const totalWeight = children.reduce((sum, child) => sum + countBeats(child), 0);
const beatScale = ctx.duration / totalWeight;
const childDuration = childWeight * beatScale;
```

This enables Strudel-like `@` weighting inside groups: `[a@4 b c]` gives `a` 4x the duration.

**Files:** Both `traverse.ts` AND `seq-traverse.ts` needed updating.

### 4. Gate Duty Cycle
**Problem:** 80% duty cycle cut notes short, conflicting with explicit rests.
**Fix:** Changed to ~100% duty cycle (tiny gap for retriggering):

```typescript
// Old
const gate = ctx.inTie ? 1 : (eventPhase < 0.8 ? 1 : 0);

// New
const gate = timeInEvent < ctx.duration - 0.001 ? 1 : 0;
```

Notes now fill their full duration. Use `[note ~]` for staccato.

## Key Differences: Strudel vs Auxlang

| Concept | Strudel | Auxlang |
|---------|---------|---------|
| Cycle length | Always 1 cycle, patterns subdivide within | Beat count from pattern structure |
| `.slow(8)` | Stretches to 8 cycles | Use `@8` on outer group |
| `@4` | Relative weight (4 out of total) | Elongate to 4 beats (now weighted in groups) |
| `[~ hh]` | 1 cycle, repeats | `[~ c1]` = 1 beat, repeats |
| Scale degrees | `n("0 1 2").scale("c:minor")` | Direct note names `c4 d4 e4` |

## Pattern Translation Guide

To convert Strudel to Auxlang:

1. **Wrap in group + elongate:** `pattern.slow(8)` → `[pattern]@8`
2. **Hihat style patterns:** `"[~ hh]"` → `"[~ c1]"` (1 beat that cycles)
3. **Scale degrees to notes:** Map manually (D minor: 0=D, 1=E, 2=F, 3=G, -1=C)
4. **Keep structure:** `[x ~]` subdivisions work the same

## Debugging Tools Created

- `src/devices/seq/dump-events.ts` - Dumps event timing from patterns
- `src/devices/seq/compare-strudel-aux.ts` - Side-by-side comparison with Strudel output
- `src/devices/seq/compare-patterns.ts` - Analyzes Strudel timing structure

## Lessons Learned

1. **Write scripts to compare data.** Don't guess at timing - dump actual events and compare.

2. **Check for duplicate code paths.** Worklet code often duplicates main-thread code.

3. **Test the actual audio path.** Unit tests on traverse functions don't catch worklet issues.

4. **Strudel's model is fundamentally different.** It uses 1-cycle patterns with fractional time, we use beat-counted patterns. The `@` modifier and outer `[...]@N` wrapper bridges this gap.

5. **Gate/duration semantics matter.** The difference between 80% duty cycle and full duration is audible - it changes the rhythm feel.
