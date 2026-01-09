# Expression-Based Sequencer Generalization

## Problem Statement

Current parser does eager evaluation—converts syntax directly to Beat/Step runtime structures. This loses information (e.g., per-note probability in chords) and prevents arbitrary nesting of operators.

## Goal

Any syntactic construct can nest inside any other. Modifiers compose uniformly over expressions.

```
{<e3 e4>, f#3?, {c4, e4, g4}@2}?
```

---

## Terminology

- **Note**: AST atom representing a pitch (has pitch string)
- **Voice**: A parallel stream of cv/gate/trig signals. Created by stack branches. A voice plays sequentially through its branch's content.
- **Voice ID**: Numeric identifier assigned to each stack branch (or the implicit single voice when no stacks exist). Stable for pattern lifetime.
- **Branch**: One child of a stack. Each branch = one voice (unless the branch is itself a stack, which flattens).
- **Channel**: avoided—too tied to single signals. Use "voice" instead.

---

## Architecture Overview

```
Source String
    ↓ tokenize
Tokens
    ↓ parse
AST (Expr tree)
    ↓ assign voice IDs
AST (with IDs)
    ↓ evaluate
Runtime Pattern
    ↓ process (per-sample)
Output: Voice[]  (each voice has id, freq, gate, trig)
```

---

## Phase 1: AST Definition

### Expr Type

```typescript
type Expr =
  // Atoms
  | { type: 'note'; pitch: string }
  | { type: 'rest' }

  // Sequential containers
  | { type: 'seq'; children: Expr[] }       // top-level sequence
  | { type: 'group'; children: Expr[] }     // [...] subdivides allocated duration
  | { type: 'alt'; children: Expr[] }       // <...> alternation

  // Parallel container (creates voices)
  | { type: 'stack'; children: Expr[] }     // {a, b, c} — each child is a branch

  // Modifiers (wrap any Expr)
  | { type: 'multiply'; child: Expr; count: number }
  | { type: 'replicate'; child: Expr; count: number }
  | { type: 'elongate'; child: Expr; count: number }
  | { type: 'euclidean'; child: Expr; hits: number; steps: number }
  | { type: 'maybe'; child: Expr; prob: number }

  // Tie (gate holds across children, pitch changes at transitions)
  | { type: 'tie'; children: Expr[] }
```

### Key Properties

- Every modifier takes Expr, returns Expr
- Tie is a container—gate stays high across all children, pitch changes at transitions
- Voice IDs are assigned to stack branches, not individual notes
- Nested stacks flatten: `{a, {b, c}}` = 3 voices
- IDs are stable for the lifetime of the pattern

---

## Phase 2: Parser Changes

### New Parser Output

`parse(input: string): Expr` instead of `Pattern`

### Grammar (unchanged surface syntax)

```
expr     = term (GLIDE term | COMMA term)*
term     = atom modifier*
atom     = NOTE | REST | group | alt | chord
group    = '[' expr* ']'
alt      = '<' expr* '>'
chord    = '{' expr (',' expr)* '}'
modifier = '*' NUM | '!' NUM | '@' NUM | '(' NUM ',' NUM ')' | '?' NUM?
```

### Tie Handling

`a_b_c` parses to `{ type: 'tie', children: [a, b, c] }`. Children are laid out sequentially within the branch's allocated duration. Gate stays high across all children; frequency changes at transition points.

### Voice ID Assignment

Voice count is determined by stack structure:
```
voiceCount(expr) =
  if expr is stack: sum of voiceCount(child) for each branch
  else: 1
```

Walk AST depth-first, incrementing counter at each leaf branch (a branch that isn't itself a stack):
```
{c4, {a4, b4}, g4}
 ↓     ↓   ↓    ↓
 0     1   2    3
```

- `c4` → voice 0
- `a4` → voice 1 (from inner stack)
- `b4` → voice 2 (from inner stack)
- `g4` → voice 3

---

## Phase 3: Evaluation

### Evaluate: Expr → RuntimePattern

```typescript
interface VoiceEvent {
  id: number
  freq: number
  beatStart: number
  beatEnd: number
  offset: number       // 0-1 within beat
  dur: number          // fraction of beat
  prob?: number
  cycle?: number
  cycleTotal?: number
}

type RuntimePattern = {
  totalBeats: number
  events: VoiceEvent[]
}
```

### Evaluation Rules

- `note` → single event at current position, fills allocated duration
- `rest` → no event, silence for allocated duration
- `seq` → children laid out sequentially (each child = 1 beat by default)
- `group` → children subdivide allocated duration equally
- `stack` → each branch gets the full allocated duration; branches run in parallel; each branch = one voice (recursively flattened if branch is a stack)
- `alt` → children get cycle tags, all at same position
- `multiply` → repeat child N times within same duration
- `replicate` → repeat child N times sequentially (adds beats)
- `elongate` → stretch child across N beats
- `euclidean` → Bjorklund distribution of child across N steps
- `maybe` → attach prob to all events within child
- `tie` → children laid out sequentially within allocated duration, gate stays high throughout

---

## Phase 4: Runtime Query

### Per-Sample Output

```typescript
interface VoiceOutput {
  id: number
  freq: number
  gate: number    // 0 or 1
  trig: number    // 0 or 1 (pulse on note onset)
}

function query(
  pattern: RuntimePattern,
  beatIndex: number,
  phase: number,
  cycle: number,
  state: QueryState
): VoiceOutput[]
```

### Logic

1. For each voice, find the event active at (beatIndex, phase)
2. Filter by cycle (for alternation)
3. Roll probability (cached in state per event occurrence)
4. For each voice: compute freq, gate (duty cycle), trig (onset detection)
5. Return parallel arrays for all voices

### Gate/Trig Per Voice

Each voice has independent gate and trig. This enables:
- Independent envelopes per voice
- Proper re-trigger semantics
- Tie working correctly (gate stays high across pitch changes within branch)

---

## Phase 5: Downstream Device Changes

### Sequencer Output Shape

```typescript
// Parallel arrays, indexed by voice ID
// Array length = voice count (fixed for pattern lifetime)
{
  cv: number[],    // [freq0, freq1, freq2, ...]
  gate: number[],  // [g0, g1, g2, ...]
  trig: number[]   // [t0, t1, t2, ...]
}
```

Voice count is determined at parse time from stack structure. Arrays are always the same length.

### Stateful Poly Devices

Poly devices (osc, env, adsr, filter, etc.) maintain state arrays indexed by voice:

```typescript
// State arrays match voice count
state.phases = number[]  // one phase per voice
state.envLevels = number[]  // one envelope level per voice
```

Voice count is fixed for pattern lifetime, so arrays don't resize during playback.

### Processing Pattern

1. Receive cv[], gate[], trig[] arrays (all same length = voice count)
2. For each voice index: process with corresponding state
3. Output combined signal (sum of voices, or separate per-voice outputs)

---

## Phase 6: Migration Strategy

1. **New parser** alongside existing—test parity on simple patterns
2. **New evaluator** Expr → RuntimePattern—verify against current output
3. **Runtime query** replaces findStepInBeat—keep output shape initially
4. **Voice IDs** added to output—update osc first as proof of concept
5. **Propagate** to remaining poly devices
6. **Cleanup** old parser and Beat/Step types

---

## Resolved Questions

1. **Gate per voice or merged?** Per voice. Enables independent envelopes.

2. **Tie semantics?** Tie lays out children sequentially within allocated duration. Gate stays high, freq changes at transitions. Tie only valid between expressions with matching voice counts.

3. **Voice count stability?** Voice count is fixed at parse time, determined by stack structure. Arrays never resize during playback.

4. **Prob inheritance?** `{a, b, c}?` — one roll for the whole stack. All or nothing.

5. **Voice creation?** Only stacks create voices. Each branch = 1 voice (unless branch is a stack, which flattens). `c4 e4 g4` = one voice, three sequential notes.

6. **Stack branch duration?** Each branch independently fills the stack's duration. Single notes hold for full duration; sequences subdivide within it. No padding or normalization between branches.

7. **Polyrhythm?** `{c4 d4 e4, f4 g4}` = 3:2 polyrhythm. Each branch subdivides independently within the same time window.

8. **Nested stacks?** Flatten. `{c4, {a4, b4}, g4}` = 4 voices.

---

## Edge Cases

### Tie + Probability

Tie controls gate behavior. Probability controls whether a segment sounds. They're orthogonal.

- `c4_e4?` — c4 always plays, e4 sometimes plays. If e4 fails, c4 gets normal gate (80% duty), second half is silent.
- `c4?_e4` — c4 sometimes plays, e4 always plays. If c4 fails, first half silent, e4 plays in second half.
- `c4?_e4?` — each rolls independently. Could get: both, just c4, just e4, or silence.

### Alternation inside Tie

`<c4 e4>_g4` — On cycle 0: c4→g4. On cycle 1: e4→g4. Gate holds throughout.

### Tie + Stack Voice Mismatch

`{c4,e4}_g4` — **invalid**. Left side has 2 voices, right side has 1. Voice counts must match for tie.

`{c4,e4}_{g4,a4}` — valid. Voice 0: c4→g4. Voice 1: e4→a4.

### Stack with Different Content

`{c4 d4, e4}` — voice 0 subdivides into 2 notes (each half duration), voice 1 holds for full duration. Enables chord voicings where some notes move and others sustain.

`{c4, e4 eb4, g4}` — major-to-minor chord. Outer voices hold, middle voice re-triggers halfway through to change from e4 to eb4.

---

## Open Questions

1. **Backward compatibility**: How to support existing patterns that expect `cv: number` (mono)?
