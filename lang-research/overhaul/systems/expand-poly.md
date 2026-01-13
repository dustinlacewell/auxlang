# System: expandPoly

Source: `src/core2/graph/expand-poly.ts`

## Purpose

Transforms a flat graph into a stereo graph by:
1. Processing nodes in topological order
2. Handling poly duplication
3. Calling device expand hooks
4. Distributing outputs to L/R channels

## Input/Output

```
FlatGraph { nodes: Node[] }
    ↓ expandPoly()
StereoGraph { nodes: Node[], leftOutputIds: NodeId[], rightOutputIds: NodeId[] }
```

## The Algorithm (328 lines)

### Step 1: Topological Sort
- Sort nodes so dependencies come before dependents
- Uses Kahn's algorithm
- Detects cycles (throws error)

### Step 2: Process Each Node

For each node in order:

```
┌─────────────────────────────────────────────────────────┐
│ Is device marked `polyphonic`?                          │
├─────────────────┬───────────────────────────────────────┤
│ YES             │ NO                                    │
│                 │                                       │
│ Don't duplicate │ Is upstream voice count > 1?         │
│ Call expand if  │ ├─ YES: Duplicate N times            │
│ exists          │ │       Call expand on each if exists│
│                 │ └─ NO:  Keep as-is                   │
│                 │         Call expand if exists        │
└─────────────────┴───────────────────────────────────────┘
```

### Step 3: Track Mapping

`nodeMap: Map<NodeId, NodeId[]>` tracks:
- Original ID → Expanded ID(s)
- Used to rewrite downstream OutputRefs

### Step 4: Stereo Distribution

Out nodes distributed round-robin:
- Voice 0 → Left
- Voice 1 → Right
- Voice 2 → Left
- ...

## Key Functions

| Function | Purpose |
|----------|---------|
| `resolveInputs` | Rewrite refs using nodeMap, poly→array |
| `getUpstreamVoiceCount` | Max voice count from all inputs |
| `pickVoiceInputs` | Extract single voice from poly inputs |
| `collectExpandedNodes` | Extract Node from WrappedNode |

## Three Processing Paths

### Path A: Polyphonic Device
- Device handles poly internally
- NOT duplicated even if upstream is poly
- Receives poly inputs (arrays)
- expand() called once with full inputs

### Path B: Non-polyphonic, Upstream Poly
- Device gets duplicated N times
- Each copy gets one voice of input
- expand() called on EACH copy (if exists)
- Result: N separate nodes

### Path C: Non-polyphonic, Mono
- No duplication
- expand() called once (if exists)
- Result: Original or expanded nodes

## Observations

1. **expand() coupling**: Calls `spec.expand(config, inputs)` but expand returns WrappedNode, needs `collectExpandedNodes` to extract plain Node

2. **Voice count determination**: Takes MAX of all inputs
   - If input A has 3 voices and input B has 2, uses 3
   - Shorter inputs wrap with modulo

3. **No voice count validation**: Doesn't check if poly counts are compatible

4. **Stereo is hardcoded**: Always distributes to L/R at end
   - No way to control stereo distribution
   - spread/pan create their own L/R nodes

5. **expand() timing**: Called DURING graph traversal
   - expand() can create new nodes
   - Those nodes must NOT go through this expansion again
   - Currently: expand returns nodes that get added to newNodes directly

## Questions Raised

- Why does expand return WrappedNode if we just extract the Node?
- What if expand() creates nodes that reference other expanded nodes?
- Is the stereo distribution at the end redundant with spread/pan?
- What happens if a polyphonic device's expand creates poly output?

## Key Insight

**expandPoly conflates four distinct operations:**

1. **Topological ordering** - Graph analysis
2. **Voice duplication** - Mechanical cloning
3. **Semantic expansion** - Device-specific transformation
4. **Stereo distribution** - Output routing

These happen interleaved in one pass, making the logic hard to follow.

## Bug: Internal Nodes Not Collected

**CONFIRMED BUG** in `pan.expand()` with poly input.

### The Problem

`collectExpandedNodes()` only adds nodes that are RETURNED from `expand()`. If `expand()` creates internal nodes that aren't returned, they're lost.

### Reproduction

```javascript
saw([220, 330, 440]).pan(0).out()
```

### What Happens

1. `pan.expand()` receives 3-voice input
2. Creates `sumNode` via `createSummer(3)` to sum voices to mono
3. Creates `panLeft` and `panRight` referencing `sumNode.id`
4. Returns `[panLeft, panRight]` - sumNode NOT returned

### Result

After expansion, the graph contains:
```
_anon22 (panLeft)  → references _anon41 (sumNode)
_anon33 (panRight) → references _anon41 (sumNode)
```

But `_anon41` **doesn't exist** in the graph!

### Root Cause

```typescript
// expand-poly.ts line 48-58
const collectExpandedNodes = (result: WrappedNode | WrappedNode[]): Node[] => {
    const wrapped = Array.isArray(result) ? result : [result];
    const nodes: Node[] = wrapped.map((w) => ({ ... }));
    newNodes.push(...nodes);  // Only adds RETURNED nodes
    return nodes;
};
```

### Impact

- Runtime would fail trying to resolve connections to non-existent nodes
- Affects `pan` with poly input (verified)
- Does NOT affect `spread` - it doesn't create internal chains
- Any expand() that creates internal node chains would have this issue

### Why spread works but pan doesn't

**spread.expand()**: Creates L/R mixers that directly reference the voice inputs. No intermediate nodes.
```
leftMixer  ← voices[0], voices[1], voices[2]
rightMixer ← voices[0], voices[1], voices[2]
```

**pan.expand()**: Creates a sumNode first, then L/R panners reference it.
```
sumNode  ← voices[0], voices[1], voices[2]   ← NOT RETURNED
panLeft  ← sumNode                           ← returned
panRight ← sumNode                           ← returned
```

### Potential Fixes

1. **expand() returns ALL nodes** - Change contract to return internal nodes too
2. **Traverse node graph** - Walk expand output and collect all referenced nodes
3. **Builder registration** - Have anonymous devices register during expand
