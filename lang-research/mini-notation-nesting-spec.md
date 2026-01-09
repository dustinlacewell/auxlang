# Mini-Notation Nesting Specification

## The Slot Model

A pattern consists of **slots**. Each slot occupies exactly 1 beat (1 trigger period). Within a slot, steps can be subdivided.

```
Pattern = Slot[]
Slot = { steps: Step[], totalDur: 1.0 }
Step = { type: "note" | "rest", freq?, dur: number }
```

Top-level items in a pattern each become one slot:
- `c4 e4 g4` → 3 slots, 1 step each
- `c4 [e4 g4] c5` → 3 slots; slot 1 has 2 steps with dur=0.5 each

## Operators and Their Scope

### Groups `[...]` - Subdivide within slot
Groups subdivide the parent's time equally among children.

```
[c4 e4]     → 1 slot, 2 steps (dur=0.5 each)
[c4 e4 g4]  → 1 slot, 3 steps (dur=0.333 each)
[[c4 e4] g4] → 1 slot, 3 steps: c4(0.25), e4(0.25), g4(0.5)
```

### Multiply `*n` - Repeat within same duration
Repeats the target n times, subdividing its duration.

```
c4*2        → 1 slot, 2 steps (dur=0.5 each), both c4
c4*4        → 1 slot, 4 steps (dur=0.25 each)
[c4 e4]*2   → 1 slot, 4 steps: c4(0.25), e4(0.25), c4(0.25), e4(0.25)
```

### Replicate `!n` - Expand to n slots
Creates n copies, each taking a full slot.

```
c4!2        → 2 slots, each with c4 (dur=1.0)
c4!3        → 3 slots
[c4 e4]!2   → 2 slots, each containing [c4 e4] subdivided
```

### Elongate `@n` - Hold for n slots
Extends duration across n slots (gate stays high).

```
c4@2        → 2 slots worth of time, single step with dur=2.0
c4@4        → 4 slots worth, dur=4.0
[c4 e4]@2   → ??? (see ambiguous cases)
```

### Alternation `<...>` - Cycle through options
Each option plays on different pattern cycles.

```
<c4 e4>     → 1 slot; c4 on cycle 0, e4 on cycle 1
<c4 e4 g4>  → 1 slot; cycles through 3 options
```

### Euclidean `(k,n)` - Spread k hits over n subdivisions
Creates n subdivisions within the slot, placing k hits using Bjorklund algorithm.

```
c4(3,8)     → 1 slot, 8 steps (dur=0.125 each), 3 are c4, 5 are rests
c4(5,8)     → 1 slot, 8 steps, 5 hits
```

## Well-Defined Nesting Combinations

### Groups inside Groups ✓
```
[c4 [e4 g4]]  → c4 gets 1/2, [e4 g4] gets 1/2 → e4=1/4, g4=1/4
```

### Alternation inside Groups ✓
```
[c4 <e4 g4>]  → c4 always plays, second note alternates
```

### Groups inside Alternation ✓
```
<c4 [e4 g4]>  → cycle 0: just c4; cycle 1: e4+g4 subdivided
```

### Multiply with Alternating Count ✓
```
c4*<1 2 3>    → cycle 0: 1 c4; cycle 1: 2 c4s; cycle 2: 3 c4s
```

### Euclidean on Notes ✓
```
c4(3,8)       → standard euclidean rhythm
```

## Ambiguous/Problematic Combinations

### Multiply on Alternation `<...>*n`
```
<c4 e4>*2     → Option A: repeat the alternation structure twice?
              → Option B: multiply applies to whichever note plays?
```
**Decision needed:** Probably disallow or define as Option B.

### Elongate on Groups `[...]@n`
```
[c4 e4]@2     → Option A: play c4, e4 then hold silence for 1 beat?
              → Option B: stretch c4, e4 to each be 1 beat?
              → Option C: error - elongate only works on single notes
```
**Decision needed:** Probably Option C (error).

### Elongate on Alternation `<...>@n`
```
<c4 e4>@2     → Does the alternation hold for 2 beats?
```
**Decision needed:** Probably disallow.

### Euclidean on Groups `[...](k,n)`
```
[c4 e4](3,8)  → Play the group at 3 of 8 positions?
              → Or error?
```
**Decision needed:** Could work - spread the group across k positions.

### Chained Operators `c4*2*3`
```
c4*2*3        → Is this (c4*2)*3 = 6 notes?
              → Or c4*(2*3) = 6 notes? (same result here)
              → Or something else?
```
**Decision needed:** Left-to-right application: (c4*2)*3 = 6 notes.

### Replicate + Multiply `c4!2*3`
```
c4!2*3        → (c4!2)*3 = 6 slots?
              → Or c4!(2*3) - not valid syntax
```
**Decision needed:** Operators apply in order of appearance.

## Recommended Restrictions

1. **Elongate `@`**: Only valid on single notes or rests, not groups/alternations
2. **Euclidean `(k,n)`**: Only valid on single notes, not groups
3. **Multiply on alternation**: Apply to the selected option, not the structure
4. **Operator chaining**: Left-to-right, but discourage via documentation

## Implementation Notes

### Current Parser
The parser flattens to `Step[]` with `dur` values. This loses slot boundaries.

### Proposed Change
Output `Slot[]` where each slot knows its boundary. The sequencer advances slots on triggers, and uses phase for within-slot subdivision.

```typescript
interface Slot {
  steps: Step[];
  // All steps' dur values sum to 1.0 (or totalDur for @n)
}

interface Step {
  type: "note" | "rest";
  freq?: number;
  dur: number;
  cycle?: number;      // For alternation
  cycleTotal?: number;
}
```

### Sequencer Logic
```
On trigger:
  slotIndex++
  if (slotIndex >= slots.length) { slotIndex = 0; cycleCount++ }

Every sample:
  phase = samplesSinceTrigger / samplesPerBeat
  currentSlot = slots[slotIndex]
  step = findStepAtPhase(currentSlot, phase)
  cv = step.freq
  gate = calculateGate(step, phase)
```

This cleanly separates:
- **Trigger handling**: advances slots
- **Phase tracking**: handles subdivision within slots
