# Information Flow Analysis

How information moves through the system phases.

## Phase Overview

```
User Code
    ↓
[Phase 1: API Execution]
    ↓
FlatGraph { nodes: Node[] }
    ↓
[Phase 2: Poly Expansion]
    ↓
StereoGraph { nodes: Node[], leftOutputIds, rightOutputIds }
    ↓
[Phase 3: Compilation]
    ↓
RuntimeGraph (executable)
```

## Phase 1: API Execution

**Trigger**: User code runs (eval or import)

**Actions**:
- Device factories called: `saw(440)`, `seq("c4 e4")`
- Chaining methods called: `.lpf(800)`, `.gain(0.5)`
- Input setters called: `.freq(440)`
- Terminal called: `.out()`

**Information Created**:
- Node objects with IDs
- Input bindings (constants, refs, arrays)
- Config values
- Implicit graph edges via OutputRefs

**Information Lost**:
- Order of user operations (only final result matters)
- Which chain created what (nodes just exist)

**Output**: FlatGraph - unordered bag of nodes

## Phase 2: Poly Expansion

**Trigger**: `expandPoly(graph)` called after API execution

**Actions**:
- Topological sort (discover dependencies)
- For each node:
  - Determine if upstream is poly
  - Duplicate if needed, or call expand
  - Update nodeMap for downstream

**Information Needed**:
- Node device type (for spec lookup)
- Upstream voice count (from nodeMap)
- Device's polyphonic flag
- Device's expand function

**Information Created**:
- New nodes (from duplication or expansion)
- nodeMap: oldId → [newIds]
- Stereo assignments (L/R)

**Information Lost**:
- Original node IDs (remapped)
- Which nodes were user-created vs expanded

**Output**: StereoGraph - expanded nodes + stereo routing

## Phase 3: Compilation

**Trigger**: `compile(stereoGraph)` called

**Actions**:
- Create runtime node instances
- Wire up signal routing
- Prepare state objects

**Information Needed**:
- Node device types (for process functions)
- Input bindings (to resolve at runtime)
- Stereo routing

**Information Created**:
- Executable runtime graph
- Per-node state objects

**Output**: RuntimeGraph - ready to process samples

---

## Voice Count Information Flow

**Where voice count is determined**:

| Source | When Known | Example |
|--------|------------|---------|
| Explicit array | API time | `saw([440, 550])` |
| Semantic expansion | Expand time | `chord("maj")` → 3 |
| Upstream propagation | Expand time | `poly.lpf()` inherits |

**How voice count propagates**:
```
saw([440, 550])  → voice count: 2
       ↓
    lpf(800)     → inherited: 2 (duplicated)
       ↓
    spread()     → polyphonic, receives 2, outputs 2 (L/R)
```

**Voice count conflicts**:
- Multiple inputs with different counts
- Resolution: MAX of all inputs
- Shorter inputs wrap with modulo

---

## What Needs What When

### At API Time (User Code Running)

| Component | Needs |
|-----------|-------|
| Device factory | DeviceSpec (for argument parsing) |
| Chaining method | Source node ID, target DeviceSpec |
| Input setter | Node's current inputs, DeviceSpec |
| OutputRef | Source node ID, output name |

**Does NOT need**:
- Voice count of upstream (not known yet for some devices)
- Final graph structure

### At Expansion Time

| Component | Needs |
|-----------|-------|
| topologicalSort | All nodes, their input refs |
| Node processing | DeviceSpec, upstream voice count |
| expand() | config, resolved inputs (with poly info) |
| nodeMap update | All IDs created for this node |

**Does NOT need**:
- Runtime state
- Sample rate

### At Compile Time

| Component | Needs |
|-----------|-------|
| Runtime creation | DeviceSpec.process |
| Signal routing | All connections resolved |
| State init | Node config |

---

## Information Gaps (Current Bugs)

### Gap 1: Unregistered Nodes
- Input setter callable `node(440)` uses `createNode` (no register)
- Downstream refs point to nodes not in builder
- Discovered at: topological sort (cycle error from missing node)

### Gap 2: expand() Return Type
- expand() returns WrappedNode
- expandPoly needs plain Node
- collectExpandedNodes extracts... but why wrap then unwrap?

### Gap 3: Anonymous Device Specs
- Anonymous devices get `_anon1`, `_anon2` names
- These ARE registered in device registry
- But their nodes aren't registered in builder (intentional for expand)
- Creates split between named/anonymous flows
