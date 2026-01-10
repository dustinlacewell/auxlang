# Strudel Pattern Features Analysis

Features extracted from real Strudel pieces, analyzed for potential implementation in Uzulang.

## Mini-Notation Operators

### Repetition & Replication

| Syntax | Name | Description | Priority | Notes |
|--------|------|-------------|----------|-------|
| `a*2` | Multiply | Repeat element 2x within its time slot | **Done** | Subdivides time, essential for drum patterns |
| `a!3` | Replicate | Shorthand for `a a a` - takes 3 slots | **Done** | Convenience |
| `a@3` | Elongate | Hold for 3 time slots | **Done** | Useful for held notes, ties |
| `a/2` | Slow | Play every 2 cycles | Medium | Pattern-level tempo change |

### Alternation & Choice

| Syntax | Name | Description | Priority | Notes |
|--------|------|-------------|----------|-------|
| `<a b c>` | Alternate | Cycle through options each time | **Done** | Core variation mechanism |
| `a*<1 2>` | Alt Multiply | Alternate multiply counts | **Done** | Bonus combo feature |
| `a?` | Maybe | 50% chance to play | Medium | Simple randomness |
| `a\|b` | Or | Random choice between a and b | Medium | More explicit than ? |
| `{a b c}` | Polymetric | Items play at different rates | Low | Advanced, complex |

### Euclidean Rhythms

| Syntax | Name | Description | Priority | Notes |
|--------|------|-------------|----------|-------|
| `a(3,8)` | Euclidean | 3 hits spread over 8 steps | **Done** | Bjorklund algorithm |
| `a(3,8,1)` | Euclidean+rot | Same, rotated by 1 | Todo | Variation of above |

### Grouping

| Syntax | Name | Description | Priority | Notes |
|--------|------|-------------|----------|-------|
| `[a b]` | Group | Subdivide into time slot | **Done** | Nesting supported |
| `[a, b]` | Stack | Polyphonic - play both | Medium | Need polyphony system |

## Pattern Methods (Post-notation)

### Time Manipulation

| Method | Description | Priority | Our Analog |
|--------|-------------|----------|------------|
| `.slow(n)` | Stretch pattern n times | High | Clock divider? |
| `.fast(n)` | Speed up pattern n times | High | Clock multiplier? |
| `.early(t)` | Shift earlier in time | Medium | Phase offset |
| `.late(t)` | Shift later in time | Medium | Phase offset |
| `.rev()` | Reverse pattern | Low | Could be notation |

### Pattern Transformation

| Method | Description | Priority | Our Analog |
|--------|-------------|----------|------------|
| `.chunk(n, fn)` | Apply fn to every nth section | Medium | JS function? |
| `.ply(n)` | Speed up within events | Low | Complex |
| `.segment(n)` | Quantize to n steps | Low | - |
| `.struct(pat)` | Apply rhythmic structure | High | Separate seq? |

### Conditional/Probability

| Method | Description | Priority | Our Analog |
|--------|-------------|----------|------------|
| `.mask(pat)` | Mute when pattern is 0 | High | Essential for arrangement |
| `.rarely(fn)` | Apply fn ~25% of time | Medium | Random gate |
| `.sometimes(fn)` | Apply fn ~50% of time | Medium | Random gate |
| `.often(fn)` | Apply fn ~75% of time | Medium | Random gate |

### Modulation Sources

| Source | Description | Priority | Our Analog |
|--------|-------------|----------|------------|
| `rand` | Random 0-1 each event | High | `noise` + `sah` |
| `perlin` | Smooth noise | Medium | Filtered noise |
| `sine` | Sine wave pattern | Done | `osc` with min/max |
| `.range(lo, hi)` | Scale to range | Done | `scale` device |

## Analysis: What Makes Strudel Expressive

### 1. Time is Fluid
Patterns naturally stretch, compress, phase-shift. Clock isn't fixed - it's relative.

### 2. Variation is Built-in
`<a b>` alternation, `?` probability, euclidean rhythms - patterns evolve by default.

### 3. Composition Through Combination
`stack()`, `mask()`, `struct()` - patterns control other patterns.

### 4. Functions as First-Class
`.chunk(4, fast(2))` - functions transform patterns, can be passed around.

## Implementation Approaches

### Approach A: Mini-Notation Expansion
Add `*`, `!`, `@`, `<>`, `()` to our parser. Patterns become more powerful at parse time.
- Pro: Familiar to Strudel users
- Con: Parser complexity, everything happens at construction

### Approach B: Pattern Combinators
Keep notation simple, add JS functions: `repeat(seq, 2)`, `alternate(seqA, seqB)`, `euclidean(3, 8)`
- Pro: More explicit, debuggable, JS-native
- Con: More verbose

### Approach C: Hybrid
Core operators in notation (`*`, `<>`), complex transforms as methods/functions.
- Pro: Balance of conciseness and explicitness
- Con: Two systems to learn

## Priority Ranking

### Must Have (Core Expression) ✅ DONE
1. ~~`*n` multiply/repeat~~ ✓
2. ~~`<a b>` alternation~~ ✓
3. ~~`(k,n)` euclidean~~ ✓
4. `mask()` or equivalent for arrangement

### Should Have (Quality of Life) - Partially Done
5. ~~`!n` replicate~~ ✓
6. ~~`@n` elongate~~ ✓
7. `.slow()` / `.fast()` - via clock div/mult
8. Random/probability (`?` notation)

### Nice to Have (Advanced)
9. `.chunk()`, `.ply()`
10. Polymetric `{}`
11. Complex stacking (requires polyphony)
