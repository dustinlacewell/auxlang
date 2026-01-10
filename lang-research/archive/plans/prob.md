# Probability & Chord Syntax Plan

## Current State

`?` probability is implemented with beat-level and step-level semantics:
- `c4?` - beat-level prob (rolls once per beat)
- `[c4? e4?]` - step-level prob (each note rolls independently)
- `[c4 e4]?` - beat-level prob (whole group rolls once)

**Problem**: Chords don't work well with probability.
- `c4,e4,g4?` - unclear semantics, `?` only applies to last note
- No way to apply modifiers to entire chord
- No way to have probabilistic notes within a chord

## Proposed Solution: `{}` Chord Syntax

Add `{}` as explicit chord grouping, similar to how `[]` groups subdivisions:

```
{c4,e4,g4}       // chord (same as c4,e4,g4)
{c4,e4,g4}?      // whole chord is probabilistic
{c4,e4,g4}?0.3   // 30% chance for chord
{c4,e4,g4}*2     // chord repeated twice in beat
{c4,e4?,g4}      // e4 probabilistic within chord
{c4,e4,g4?0.2}   // g4 has 20% chance
```

### Semantics

- `{}` stacks all notes inside into one polyphonic step
- Modifiers after `}` apply to the whole chord (beat-level)
- `?` on notes inside `{}` = per-frequency probability

### Per-Frequency Probability

This is the interesting new capability. A chord like `{c4,e4?,g4}` means:
- c4 always plays
- e4 has 50% chance
- g4 always plays

At runtime, we roll for e4 and either include it or not in the `freqs` array.

## Implementation Steps

### 1. Tokenizer
Add `LBRACE` and `RBRACE` token types for `{` and `}`

### 2. Parser - parseChord()
New function similar to parseGroup but:
- Collects notes (not subdivisions)
- Merges frequencies into single step
- Preserves per-note `prob` on each frequency

### 3. Types - NoteStep.freqs
Change from `freqs: number[]` to something that can track per-freq probability:
```typescript
interface FreqWithProb {
  freq: number;
  prob?: number;  // undefined = always play
}
// OR keep freqs simple and add parallel array:
freqs: number[];
freqProbs?: (number | undefined)[];  // parallel to freqs
```

Option B (parallel arrays) is less disruptive to existing code.

### 4. Runtime - seq.ts
When building CV output for a chord:
- For each freq, check if it has prob
- Roll dice per-freq
- Only include freqs that pass

### 5. Tests
- `{c4,e4,g4}` parses to single step with 3 freqs
- `{c4,e4,g4}?` has beat-level prob
- `{c4,e4?,g4}` has step with freq 1 having prob 0.5
- Runtime correctly filters freqs by probability

## Questions

1. **Comma still required inside `{}`?** Yes, for consistency. `{c4 e4 g4}` would be a parse error or interpreted as subdivisions-then-stack (confusing).

2. **Nested chords?** `{c4,{e4,g4}}` - probably not useful, treat as flat.

3. **Chord + subdivide?** `[{c4,e4} {g4,b4}]` - two chords subdividing a beat. Should work naturally.

4. **Keep `,` syntax?** Yes, `c4,e4,g4` still works for simple chords. `{}` is for when you need modifiers.

## Alternative Considered

Could try to make `c4,e4,g4?` work by having comma preserve right-side prob. But:
- Modifier precedence becomes confusing
- Can't do `?` on middle note of chord
- Can't do other modifiers like `*` on chords

Explicit `{}` syntax is cleaner and more powerful.
