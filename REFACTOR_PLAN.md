# Sequencer Refactor: Flattened Events → Stateful AST Traversal

## Problem
Current architecture flattens AST to `VoiceEvent[]` during evaluation, losing hierarchical structure. This makes probability semantics impossible to implement correctly - `{c4,e4,g4}?0.5` should roll once for the whole stack, but currently rolls independently per voice.

## Solution
Replace flattened evaluation with stateful AST traversal. The sequencer maintains its position in the AST and traverses it per-sample, preserving structure.

## Architecture Change

### Before (Flattened)
```
Parse → AST → Evaluate → VoiceEvent[] → Query (per-sample)
                          ↓ (structure lost)
                    [{c4, prob:0.5}, {e4, prob:0.5}, {g4, prob:0.5}]
```

### After (Stateful Traversal)
```
Parse → AST → Traverse (per-sample, stateful)
              ↓
        MaybeExpr { prob: 0.5
          StackExpr {
            [c4, e4, g4]
          }
        }
```

## Files to Modify

### 1. `types.ts`
- Remove: `VoiceEvent`, `RuntimePattern`
- Keep: All `Expr` types
- Add: `TraversalState` interface for maintaining position/decisions
- Add: `TraversalOutput` for per-sample output

### 2. `evaluate.ts` 
- **DELETE ENTIRE FILE** - no longer needed
- Flattening logic is replaced by direct traversal

### 3. `query.ts` → `traverse.ts` (rename)
- Replace event-based query with AST traversal
- Implement `traverse(expr: Expr, time: TimeContext, state: TraversalState): TraversalOutput`
- Handle probability decisions at node level (cached by AST node, not event)
- Maintain voice state per voice ID

### 4. `seq.ts`
- Remove `evaluate()` call - no longer pre-processes AST
- Store raw `Expr` AST in config
- Call `traverse()` per-sample instead of querying events
- Maintain `TraversalState` in device state

### 5. Tests
- `evaluate.test.ts` - DELETE (no evaluation phase)
- `query.test.ts` → `traverse.test.ts` - rewrite for traversal
- Test probability semantics work correctly

## Key Interfaces

```typescript
interface TimeContext {
  beatIndex: number;
  phase: number;        // 0-1 within beat
  cycle: number;        // for alternation
}

interface TraversalState {
  // Probability decisions keyed by expr object identity
  probDecisions: Map<Expr, boolean>;
  
  // Per-voice state (CV sample-and-hold, last event for trig)
  voiceCV: Map<number, number>;
  lastEventId: Map<number, string>;
}

interface TraversalOutput {
  cv: PolySignal;       // VoiceChannel[]
  gate: PolySignal;
  trig: PolySignal;
}
```

## Implementation Steps

1. **Create new traverse.ts** with stateful traversal logic
2. **Update types.ts** - remove old types, add new ones
3. **Update seq.ts** - use traverse instead of evaluate+query
4. **Delete evaluate.ts and query.ts**
5. **Rewrite tests** for new architecture
6. **Verify probability works correctly**

## Benefits
- ✓ Probability semantics work correctly (roll once per AST node)
- ✓ Code matches mental model (structure preserved)
- ✓ Simpler overall (no flattening step)
- ✓ Easier to debug (can inspect AST position)

## Performance
Tree traversal per-sample is slightly slower than array lookup, but:
- Patterns are small (typically <100 nodes)
- Modern JS engines optimize switch statements well
- Can optimize later if needed (memoization, etc.)
