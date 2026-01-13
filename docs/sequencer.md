# Sequencer

The `seq` device parses mini-notation and outputs cv/gate/trig signals.

## Mini-Notation

```
c4        note (pitch + octave)
~         rest
[c4 e4]   subdivide time equally
<c4 e4>   alternate each cycle
{c4,e4}   stack/chord (creates voices)
c4*2      repeat within time slot
c4!2      replicate (takes 2 beats)
c4@2      elongate (hold 2 beats)
c4(3,8)   euclidean (3 hits over 8 steps)
c4_e4     tie/legato (gate stays high)
c4?       probability (50% chance)
c4?0.3    probability (30% chance)
```

## Polyphony

Only stacks create voices:
- `c4 e4 g4` = 1 voice, 3 sequential notes
- `{c4,e4,g4}` = 3 voices (chord)
- `{c4, {a4,b4}}` = 3 voices (nested stacks flatten)

Polyrhythm: `{c4 d4 e4, f4 g4}` = 3:2 (branches subdivide independently)

## Output

```typescript
{ cv: number[], gate: number[], trig: number[] }
```

Arrays indexed by voice ID. Length fixed at parse time.

## Architecture

Cursor-based pattern stepping:
- **O(1) per sample**: Read cached cv/gate/trig from cursor
- **O(tree) per beat**: Step cursor through AST on clock trigger

The cursor maintains a path through the AST and cached output values. Only recomputes on beat boundaries.

Probability decisions cached by AST node path + cycle.

## State Preservation

Cursor state survives re-eval via `deepCloneState()`. The cursor is a plain object with nested frames, correctly cloned for the new graph.

## Decisions

- D053-D058: Voice creation and output shape
- D059: Expression-based parser
- D067: Cursor-based stepping (not per-sample traversal)

## See Also

- [src/core2/devices/seq/](../src/core2/devices/seq/) - implementation
- [src/core2/devices/seq/cursor/](../src/core2/devices/seq/cursor/) - cursor stepping logic
