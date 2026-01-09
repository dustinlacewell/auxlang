# Expression Feature Interaction Matrix

How each feature interacts when combined with others.

## Features

| Code | Feature | Type |
|------|---------|------|
| N | Note | atom |
| R | Rest | atom |
| G | Group `[...]` | container |
| A | Alternation `<...>` | container |
| S | Stack `{...}` / `,` | container |
| T | Tie `_` | binary/container |
| M | Multiply `*n` | modifier |
| P | Replicate `!n` | modifier |
| E | Elongate `@n` | modifier |
| U | Euclidean `(k,n)` | modifier |
| ? | Maybe `?p` | modifier |

---

## Group `[...]`

| With | Example | Behavior |
|------|---------|----------|
| Note | `[c4 e4]` | subdivides: each note gets 0.5 duration |
| Rest | `[c4 ~]` | rest takes equal subdivision |
| Group | `[[c4 e4] g4]` | nested subdivision: c4=0.25, e4=0.25, g4=0.5 |
| Alt | `[<c4 e4> g4]` | alt in first half, g4 in second half |
| Stack | `[{c4,e4} g4]` | chord in first half, note in second |
| Tie | `[c4_e4]` | tie within subdivisions, gate holds across both |
| Multiply | `[c4*2 e4]` | c4 subdivides further: 0.25, 0.25, then e4=0.5 |
| Replicate | `[c4!2]` | = `[c4 c4]` replicate expands then group subdivides |
| Elongate | `[c4@2 e4]` | c4 takes 2/3 duration, e4 takes 1/3 |
| Euclidean | `[c4(2,3)]` | euclidean within subdivision—2 hits over 3 sub-slots |
| Maybe | `[c4? e4]` | per-step prob: c4 rolls, e4 always |

---

## Alternation `<...>`

| With | Example | Behavior |
|------|---------|----------|
| Note | `<c4 e4>` | cycle 0: c4, cycle 1: e4 |
| Rest | `<c4 ~>` | cycle 0: c4, cycle 1: rest |
| Group | `<[c4 e4] g4>` | cycle 0: subdivided, cycle 1: single note |
| Alt | `<<c4 e4> g4>` | nested alt—outer cycles through (inner alt, g4) |
| Stack | `<{c4,e4} g4>` | cycle 0: chord, cycle 1: single |
| Tie | `<c4 e4>_g4` | alt determines first pitch (by cycle), gate holds to g4 |
| Multiply | `<c4 e4>*2` | current alt choice repeated twice in beat |
| Replicate | `<c4 e4>!2` | current alt choice as 2 separate beats |
| Elongate | `<c4 e4>@2` | current alt choice held for 2 beats |
| Euclidean | `<c4 e4>(3,8)` | current alt choice distributed euclidean |
| Maybe | `<c4 e4>?` | whole alt has prob—if fails, silent regardless of cycle |

---

## Stack `{...}` / `,`

**Key rules:**
- Only stacks create new voices (one per branch)
- Nested stacks flatten: `{a, {b, c}}` = 3 voices
- Stack inherits duration from parent context
- Each branch independently fills the stack's duration
- Single notes hold for full duration; sequences subdivide within it
- Voice count is fixed at parse time

| With | Example | Behavior |
|------|---------|----------|
| Note | `{c4,e4,g4}` | chord: 3 voices, each holds for full duration |
| Rest | `{c4,~,g4}` | 3 voices, middle voice is silent for full duration |
| Sequence | `{c4 d4, e4}` | voice 0 subdivides (2 notes), voice 1 holds |
| Polyrhythm | `{c4 d4 e4, f4 g4}` | 3:2 polyrhythm—voices subdivide independently |
| Group | `{[c4 e4], g4}` | voice 0 subdivides, voice 1 holds |
| Alt | `{<c4 e4>, g4}` | voice 0 alternates, voice 1 constant |
| Stack | `{{c4,e4}, g4}` | flattens: 3 voices |
| Tie | `{c4,e4}_g4` | **invalid**: voice count mismatch (2 vs 1) |
| Tie | `{c4,e4}_{g4,a4}` | valid: voice 0 c4→g4, voice 1 e4→a4 |
| Multiply | `{c4,e4}*2` | whole chord repeated twice in beat |
| Replicate | `{c4,e4}!2` | chord on beat 0 and beat 1 |
| Euclidean | `{c4,e4}(3,8)` | chord distributed euclidean |
| Maybe | `{c4,e4}?` | one roll for whole stack—all or nothing |
| Maybe (inner) | `{c4,e4?,g4}` | e4 has independent prob, others always |

---

## Tie `_`

**Key rules:**
- Tie lays out children sequentially within allocated duration
- Gate stays high across all children; pitch changes at transitions
- Tie only valid between expressions with matching voice counts

| With | Example | Behavior |
|------|---------|----------|
| Note | `c4_e4` | pitch changes halfway, gate holds throughout |
| Rest | `c4_~` | c4 holds for two beats (tying to ~ holds) |
| Group | `[c4 e4]_g4` | last step of group ties to g4 |
| Alt | `<c4 e4>_g4` | alt picks first pitch based on cycle, gate holds to g4 |
| Stack | `{c4,e4}_g4` | final note of each branch ties to g4 |
| Stack | `{c4,e4}_{g4,a4}` | notes in first stack tie to corresponding note in second stack |
| Tie | `c4_e4_g4` | three pitches in sequence, gate holds throughout |
| Multiply | `c4*2_e4` | c4 repeated, last rep ties to e4 |
| Replicate | `c4!2_e4` | c4 on beats 0,1, ties to e4 on beat 2 |
| Elongate | `c4@2_e4` | c4 held 2 beats, ties to e4 on beat 3 |
| Euclidean | `c4(3,8)_e4` | final hit ties to e4 |
| Maybe | `c4_e4?` | c4 always, e4 rolls—if fails, just c4 with normal gate |
| Maybe | `c4?_e4` | c4 rolls—if fails, just e4 |

---

## Multiply `*n`

| With | Example | Behavior |
|------|---------|----------|
| Note | `c4*3` | c4 three times, each 1/3 of beat |
| Rest | `~*3` | three rests (same as one rest, no audible diff) |
| Group | `[c4 e4]*2` | whole group twice: c4,e4,c4,e4 each 0.25 |
| Alt | `<c4 e4>*2` | current alt choice twice |
| Stack | `{c4,e4}*2` | chord twice |
| Tie | `c4*2_e4` | c4,c4 then e4, last c4 ties to e4 |
| Multiply | `c4*2*3` | 2×3=6 repetitions? or 3 reps of the doubled? |
| Replicate | `c4*2!3` | modifier order: multiply then replicate = 3 beats of doubled |
| Elongate | `c4*2@3` | multiply then elongate = ???  (conflict) |
| Euclidean | `c4*2(3,8)` | modifier order: multiply then euclidean? |
| Maybe | `c4*2?` | whole multiplied result has prob |

---

## Replicate `!n`

| With | Example | Behavior |
|------|---------|----------|
| Note | `c4!3` | c4 on beats 0, 1, 2 (3 separate beats) |
| Rest | `~!3` | 3 beats of rest |
| Group | `[c4 e4]!2` | subdivided beat repeated: beats 0 and 1 both have c4,e4 |
| Alt | `<c4 e4>!2` | current alt on 2 beats (same pitch both) |
| Stack | `{c4,e4}!2` | chord on beats 0 and 1 |
| Tie | `c4!2_e4` | c4, c4, then e4—last c4 ties to e4 |
| Multiply | `c4!2*3` | order: replicate then multiply = each beat is tripled? |
| Replicate | `c4!2!3` | 2×3=6 beats |
| Elongate | `c4!2@3` | replicate then elongate = each replicated beat stretched? |
| Euclidean | `c4!2(3,8)` | replicate then euclidean? |
| Maybe | `c4!2?` | prob applies to whole—all beats or none |

---

## Elongate `@n`

| With | Example | Behavior |
|------|---------|----------|
| Note | `c4@3` | c4 held for 3 beats, gate high entire time |
| Rest | `~@3` | 3 beats of silence |
| Group | `[c4 e4]@2` | subdivided beat stretched to 2 beats? or group plays twice? |
| Alt | `<c4 e4>@2` | current alt held 2 beats |
| Stack | `{c4,e4}@2` | chord held 2 beats |
| Tie | `c4@2_e4` | c4 held 2 beats, ties to e4 on beat 3 |
| Multiply | `c4@2*3` | conflict—elongate then multiply? |
| Replicate | `c4@2!3` | elongated note replicated 3 times = 6 beats total |
| Elongate | `c4@2@3` | 2×3=6 beats held |
| Euclidean | `c4@2(3,8)` | each euclidean hit is elongated? |
| Maybe | `c4@2?` | prob for whole elongated note |

---

## Euclidean `(k,n)`

| With | Example | Behavior |
|------|---------|----------|
| Note | `c4(3,8)` | c4 on 3 of 8 beats, rests on others |
| Rest | `~(3,8)` | rests distributed euclidean (no-op) |
| Group | `[c4 e4](3,8)` | subdivided beat on 3 of 8 positions |
| Alt | `<c4 e4>(3,8)` | current alt distributed euclidean |
| Stack | `{c4,e4}(3,8)` | chord on 3 of 8 beats |
| Tie | `c4(3,8)_e4` | last euclidean hit ties to e4 |
| Multiply | `c4(3,8)*2` | each euclidean hit doubled within its beat |
| Replicate | `c4(3,8)!2` | whole euclidean pattern repeated = 16 beats |
| Elongate | `c4(3,8)@2` | each hit elongated? or whole pattern stretched? |
| Euclidean | `c4(3,8)(2,5)` | nested euclidean—select 2 of 5 from the 3 hits? |
| Maybe | `c4(3,8)?` | whole euclidean pattern has prob |

---

## Maybe `?`

| With | Example | Behavior |
|------|---------|----------|
| Note | `c4?` | 50% chance to play |
| Rest | `~?` | rest with prob (no audible difference) |
| Group | `[c4 e4]?` | whole group has prob |
| Group (inner) | `[c4? e4?]` | each step independent prob |
| Alt | `<c4 e4>?` | whole alt has prob |
| Stack | `{c4,e4}?` | one roll for all voices |
| Stack (inner) | `{c4?,e4,g4}` | c4 independent, others always |
| Tie | `c4?_e4` | c4 rolls, e4 always—see Tie section |
| Multiply | `c4?*2` | order matters—prob then multiply? |
| Multiply | `c4*2?` | multiply then prob—whole thing rolls |
| Replicate | `c4?!2` | prob per beat? or one roll for all? |
| Elongate | `c4?@2` | prob applies to whole elongated note |
| Euclidean | `c4?(3,8)` | prob on each hit? or whole pattern? |
| Maybe | `c4?0.3?0.5` | chained prob—both must pass? (probably error) |

---

## Resolved (Modifier Edge Cases)

1. **Modifier order**: `c4*2@3` — left-to-right. Multiply first (doubles within beat), then elongate stretches that result across 3 beats.

2. **Nested Euclidean**: `c4(3,8)(2,5)` — **error**. Reject at parse time.

3. **Chained Maybe**: `c4?0.3?0.5` — multiply probabilities. 0.3 × 0.5 = 0.15 chance.

4. **Group + Elongate**: `[c4 e4]@2` — stretch subdivisions. Each note gets 1 beat instead of 0.5.

---

## Resolved

1. **Replicate inside Group**: `[c4!2]` = `[c4 c4]` — replicate expands, then group subdivides the result.

2. **Stack branch duration**: Each branch independently fills the stack's duration. Single notes hold, sequences subdivide. `{c4 d4, e4}` = voice 0 plays two notes (each half duration), voice 1 holds one note (full duration). No padding between branches.

3. **Polyrhythm**: `{c4 d4 e4, f4 g4}` = 3:2 polyrhythm. Each branch subdivides independently within the same time window.

4. **Tie voice mismatch**: `{c4,e4}_g4` — invalid. Voice counts must match.

5. **Voice creation**: Only stacks create voices. Each branch = 1 voice (unless branch is a stack). `c4 e4 g4` = one voice, three sequential notes.

6. **Nested stacks flatten**: `{c4, {a4, b4}, g4}` = 4 voices. Voice count = sum of branch voice counts, recursively.

7. **Voice IDs assigned to branches**: IDs are stable for pattern lifetime, determined by structure not content.
