# Core2 Architecture: Polyphony and Expansion Refactor

## Executive Summary

After deep analysis with multiple perspectives, the core insight is:

**The problem is not WHEN expansion happens, but that we have TWO node creation paths.**

Current state:
- Named devices → `createDeviceNode()` → registers with builder
- Anonymous devices → `createNode()` → no builder registration

This bifurcation causes all the complexity. The fix is simpler than a full architecture rewrite.

---

## The Root Cause

The codebase conflates THREE distinct concerns in `expandPoly()`:
1. **Semantic expansion** - chord→3 notes, seq pattern decomposition
2. **Voice duplication** - downstream nodes cloned for poly inputs
3. **Stereo distribution** - L/R output assignment

These are conceptually separate but currently interleaved in one 328-line function.

---

## The Three Types of "Expansion"

| Type | Example | Nature | Current Handling |
|------|---------|--------|-----------------|
| **Semantic** | `chord("maj")` → 3 chordTones | Device-specific transformation | `expand()` hook |
| **Voice** | `saw([440,550])` → saw.0, saw.1 | Mechanical duplication | `upstreamVoiceCount > 1` |
| **Stereo** | Output → L/R distribution | Topology finalization | End of `expandPoly` |

---

## Architecture Options Considered

### Option A: Immediate Expansion (Advocate: Pro)
Expand arrays at API time. `saw([440,550])` immediately creates 2 saws.
- **Pro**: Simpler, what you see is what runs, no nodeMap tracking, single node creation path
- **Con**: Can't see compressed graph, spread needs voice count it may not have yet

### Option B: Two-Phase Expansion
Separate semantic expansion from voice duplication.
- **Pro**: Cleaner separation of concerns, better debugging, intermediate representation
- **Con**: More passes, state flow between phases, possibly just moving complexity

### Option C: Width as Metadata (Synthesizer's Insight)
Signals have width, devices process lanes. Nodes aren't duplicated - they have width.
- **Pro**: Elegant SIMD-like model, matches FAUST/GPU shader patterns
- **Con**: Major refactor, runtime changes needed, long-term vision

### Option D: Explicit Poly Only
Force `poly([saw(440), saw(550)])` syntax, no implicit array expansion.
- **Pro**: No ambiguity, clear intent
- **Con**: Terrible ergonomics, doesn't solve internal issues

---

## Skeptic's Key Insight

> "The anonymous device hack is a code smell. Runtime device spec creation with dynamically generated input names (v0, v1, v2...) pollutes the registry with _anon1, _anon2, etc. These specs are not statically knowable."

> "What if poly expansion happened at a FUNDAMENTALLY different time? Instead of nodes being created and then cloned, what if the API captured **intent** and expansion was the **only** node creation?"

---

## Synthesizer's Key Insight

> "The elegant solution is simpler than expected: `createNode` never registers. Device factories register their output. `expand` hooks use `createNode` freely. No anonymous device workaround needed."

The graph is implicitly defined by what's reachable from `.out()`. The builder becomes a **collector**, not an accumulator.

---

## Recommended Approach: Unified Node Creation

### What's Already Done
1. `createNode()` - just creates plain Node data, no registration ✓
2. `createDeviceNode()` - calls createNode, then registers (for named devices) ✓
3. Anonymous `device({})` - calls createNode directly, skips builder ✓

### What Remains
1. **seq.ts** still uses old 3-arg expand signature
2. **DeviceSpec** expand returns `WrappedNode` but could be simpler with `Node`
3. **expand-poly** collector handles both, but could be cleaner

---

## Immediate Action Plan

### Step 1: Fix seq.ts expand signature
```typescript
// Import createNode directly
import { createNode } from "../../graph/create-node";

expand(config, inputBindings) {
  const pattern = config.pattern as string;
  const clk = inputBindings.clk;
  // ... use createNode("seq", {...}, {...}) directly
}
```

### Step 2: Optionally simplify DeviceSpec
Change expand signature to return `Node | Node[]` instead of `WrappedNode | WrappedNode[]`.
(WrappedNode extends Node, so both work, but plain Node is conceptually cleaner)

### Step 3: Test
- `npx tsc --noEmit` - Type check passes
- `npx vitest run src/tests/core2/` - Core2 tests pass
- Manual test with interactive examples - chord/spread/pan/seq produce sound

---

## Future Architecture Directions

If we want a cleaner long-term architecture, consider:

1. **Two-Phase Expansion** (Option B) for cleaner separation
2. **Pull-based Collection** - out() walks upstream and collects, no push to builder
3. **Width as Metadata** - signals carry voice count, runtime processes lanes

But these are larger refactors. The immediate fix is small and targeted.

---

## Key Files

| File | Status | Notes |
|------|--------|-------|
| `src/core2/devices/seq/seq.ts` | NEEDS FIX | Update expand signature |
| `src/core2/device/device-spec.ts` | OK | expand type works |
| `src/core2/graph/expand-poly.ts` | OK | Handles both Node and WrappedNode |
| `src/core2/graph/create-node.ts` | OK | Pure node creation |
| `src/core2/device/device.ts` | OK | Anonymous vs named factory |
| `src/core2/devices/chord.ts` | OK | Uses anonymous device correctly |
| `src/core2/devices/spread.ts` | OK | Uses anonymous device correctly |
| `src/core2/devices/pan.ts` | OK | Uses anonymous device correctly |

