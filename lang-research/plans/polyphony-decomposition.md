# Polyphony via AST Decomposition

An alternative to runtime voice tracking: decompose polyphonic patterns into separate mono patterns at parse time, then duplicate the downstream graph.

---

## Current Approach: Runtime Voice IDs

Today, `seq("{c4, e4, g4}")` outputs a `PolySignal` with 3 voices:
```
[{id: 0, value: 261.6}, {id: 1, value: 329.6}, {id: 2, value: 392.0}]
```

Every downstream device must:
- Iterate voice IDs
- Key state by voice ID (e.g., `phases.get(id)`)
- Build output with `{id, value}` pairs

This works but complicates device authoring and adds overhead.

---

## Proposed Approach: AST Decomposition

### Core Idea

At parse time, decompose a polyphonic pattern into N mono patterns:

```
"{c4, e4, g4} ~ {d4, f4, a4}"
```

Becomes three separate ASTs:
```
Voice 0: "c4 ~ d4"
Voice 1: "e4 ~ f4"
Voice 2: "g4 ~ a4"
```

Each pattern is mono. The `StackExpr` nodes are eliminated, replaced by projecting each voice's timeline.

### Graph Duplication

At graph construction, when connecting to a decomposed seq:

```javascript
seq("{c4, e4, g4}").saw().lpf({ cutoff: 800 }).out()
```

Expands to:
```
seq("c4") → saw_0 → lpf_0 ─┐
seq("e4") → saw_1 → lpf_1 ─┼→ mix → out
seq("g4") → saw_2 → lpf_2 ─┘
```

All devices are mono. No `PolySignal` exists at runtime.

---

## Decomposition Rules

### Simple Stack

```
{a, b, c}  →  Voice 0: a
              Voice 1: b
              Voice 2: c
```

### Stack in Sequence

```
{a, b} x {c, d}  →  Voice 0: a x c
                    Voice 1: b x d
```

The sequence structure is preserved; each position's stack is "unzipped" across voices.

### Nested Stacks (Flattening)

```
{a, {b, c}}  →  Voice 0: a
                Voice 1: b
                Voice 2: c
```

Nested stacks flatten. The inner `{b, c}` contributes 2 voices to the total.

### Modifiers on Stacks

```
{a, b}*2  →  Voice 0: a*2
             Voice 1: b*2
```

Modifiers distribute to each decomposed branch.

### Ties Across Stacks

```
{a, b}_{c, d}  →  Voice 0: a_c
                  Voice 1: b_d
```

Tie connects corresponding voices across the stack boundary.

### Groups Inside Stacks

```
{[a b], c}  →  Voice 0: [a b]
               Voice 1: c
```

Non-stack children (groups, seqs) pass through unchanged to their voice.

### Alternation Inside Stacks

```
{<a b>, c}  →  Voice 0: <a b>
               Voice 1: c
```

Alt nodes pass through unchanged.

### Stack Inside Alternation

```
<{a, b}, {c, d}>  →  ???
```

This is tricky. The alternation switches between two 2-voice stacks. The voice count is consistent (2), but which notes play changes per cycle.

Decomposition:
```
Voice 0: <a, c>
Voice 1: <b, d>
```

Each voice gets an alternation between its corresponding positions.

### Stack Inside Group (Subdivision)

```
[{a, b} c]  →  Voice 0: [a c]
               Voice 1: [b c]
```

The mono element `c` broadcasts to all voices within the subdivision context.

---

## Implementation Sketch

### 1. Voice Counting (Existing)

`voiceCount(expr: Expr): number` already computes total voices by summing stack children recursively.

### 2. New: AST Projection

```typescript
function projectVoice(expr: Expr, voiceIndex: number, voiceCount: number): Expr
```

Given an expr and a voice index, returns a new AST representing only that voice's timeline.

For non-stack nodes, return the node unchanged (mono broadcasts).
For stack nodes, select the appropriate child based on voice index and recurse.

### 3. New: Decompose Pattern

```typescript
function decomposePattern(expr: Expr): Expr[]
```

Returns an array of mono ASTs, one per voice.

```typescript
function decomposePattern(expr: Expr): Expr[] {
  const count = voiceCount(expr);
  return Array.from({ length: count }, (_, i) => projectVoice(expr, i, count));
}
```

### 4. Graph Expansion

When `seq(pattern)` is connected to downstream devices, check `voiceCount`. If > 1:
- Decompose into N mono patterns
- Create N seq descriptors
- Duplicate downstream graph N times
- Insert mix at reconnection point

This happens at reify/graph construction time, not runtime.

---

## Edge Cases to Handle

### Voice Count Mismatch in Ties

```
{a, b, c}_{d, e}
```

3 voices tied to 2 voices. Options:
- Error at parse time
- Truncate (voices 0,1 tie; voice 2 drops)
- Wrap (voice 2 ties to voice 0 of second stack)

Current behavior uses first child's voice count. Decomposition should match.

### Polyrhythm

```
{c4 d4 e4, g3 a3}
```

Voice 0 has 3 steps, voice 1 has 2 steps. This is a 3-against-2 polyrhythm.

Decomposition:
```
Voice 0: "c4 d4 e4"  → 3 beats total, loops at beat 3
Voice 1: "g3 a3"     → 2 beats total, loops at beat 2
```

Each decomposed seq is fully independent with its own `totalBeats` and loop cycle. The polyrhythm emerges naturally from the different loop lengths - they phase against each other and realign at LCM(3,2) = 6 beats.

This is correct behavior. Polyrhythm doesn't mean "same time span, different subdivisions" - it means independent cycles that drift and realign. Decomposition handles this automatically because each voice becomes a separate seq with no shared timing context.

### Modifiers That Change Timing

```
{a*2, b*3}
```

Voice 0 plays `a a`, voice 1 plays `b b b`. Each decomposed pattern handles its own timing independently.

### Probability Modifiers

```
{a?, b}
```

Voice 0 plays `a` 50% of the time, voice 1 always plays `b`. Decomposed patterns preserve probability per-voice.

### Empty Voices (Rest Projection)

```
{a, ~}
```

Voice 1 is always silent. Decomposed pattern is just `~`. The graph still gets duplicated, but that voice outputs silence. Could optimize by detecting all-rest patterns.

---

## Benefits

1. **Devices stay mono** - No voice iteration, no state keying by ID
2. **KabelSalat compatibility** - Same execution model (graph duplication for polyphony)
3. **Simpler signal type** - Just `number`, no `{id, value}[]`
4. **State is automatic** - Each device instance has its own state object
5. **No hot-loop overhead** - No voice ID lookups per sample

---

## Tradeoffs

1. **Graph size scales with polyphony** - 8-voice chord = 8x graph duplication
2. **No dynamic voice count** - Voice count fixed at parse time (but this is already true for mini-notation)
3. **Memory for state** - N copies of filter state vs one Map keyed by ID (probably similar)
4. **Decomposition complexity** - AST transformation adds parsing complexity

---

## Open Questions

1. **Where does expansion happen?** At `seq()` call? At `reify()`? When connecting downstream?

2. **How does user observe polyphony?** If they write `seq("{a,b}").saw()`, do they see one descriptor or two? Probably one "poly descriptor" that expands internally.

3. **What about non-seq polyphony?** If user writes `osc([220, 330])`, should that also trigger graph duplication? Or is that a different mechanism?

4. **Mix insertion point** - How do we know where to insert the mix? At `.out()`? At any explicit `mix()` call? What if user wants to process voices differently before mixing?

5. **Debugging/visualization** - How to show the expanded graph to users? Or keep it hidden?

---

## Relationship to Uzu

This could combine with Uzu's chaining syntax:

```javascript
seq("{c4, e4, g4}").saw().lpf({ cutoff: 800 }).mix({ spread: 0.8 }).out()
```

The chain describes one logical signal path. Under the hood, `seq` through `lpf` expands to 3 parallel paths, then `mix` collapses them to stereo.

User writes mono-style code. Polyphony is implicit from the pattern, realized as graph structure.
