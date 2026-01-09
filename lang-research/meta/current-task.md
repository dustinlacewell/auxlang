# Current Task

**Sequencer architecture refactor - COMPLETED**

## Completed

### Phase 1: Core Implementation
- New Expr AST types (`src/devices/seq/expr/types.ts`)
- Parser: `parseExpr()` produces Expr tree
- Evaluator: `evaluate()` transforms Expr → RuntimePattern
- Query: `query()` for per-sample output
- Device: `seqExpr()` device with `.clk()` input, outputs `cv`, `gate`, `trig`
- Tests: 85 new tests for expr system (224 total passing)
- Test suite: 8 interactive test cases under "Expr Parser" category
- API export: `seqExpr` available in user scripts

### Phase 2: Architecture Refactor
- **Fixed probability bug**: `{c4,e4,g4}?0.5` now rolls once for entire stack (all-or-nothing)
- **Deleted flattened event system**: Removed `evaluate.ts` and `query.ts`
- **Implemented stateful AST traversal**: Created `traverse.ts` with per-sample tree walk
- **Worklet integration**: Added `runtime/worklet/seq-traverse.ts` to `globalThis.seqTraverse`
- **Probability decisions cached by AST node path**: Preserves hierarchical structure
- **Applied √n normalization**: `sumToMono()` uses perceptually balanced mixing
- Tests: Created `traverse.test.ts` with probability verification

### Dynamic Voice Count (D065) - Attempted and Reverted
- ✓ Signals carry voice ID with each channel: `{ id: number, value: number }[]`
- ✗ Output only active voices - caused clicks when voices disappeared
- Solution: Output all voices with gate=0 for inactive ones
- Devices can check gate and skip processing when gate=0
- Maintains continuity while still allowing CPU savings

## Next Steps

Next major features for "coastline" port:
- Sample playback (drum samples)
- Chord system (parse chord names → frequencies)
- Voicing (spread notes across octaves)
- Mask/mute for arrangement

## Key Design Decisions

- Sequencer uses stateful AST traversal (D067)
- Probability decisions cached by AST node path + cycle
- √n normalization for polysignal mixdown (D068)
- Worklet utilities via `globalThis.seqTraverse` (ES modules)
- Config values inlined via `new Function('return 3')` for serialization
