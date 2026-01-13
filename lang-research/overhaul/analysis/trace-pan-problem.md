# Trace: Pan with Poly Input

The known-buggy case. Does VoiceRef change anything here?

## Test Case

```javascript
saw([220, 330, 440]).pan(0.3).out()
```

## Current Behavior (Buggy)

### Phase 1: API Time

```
saw1: { device: "saw", inputs: { freq: [220, 330, 440] } }
pan2: { device: "pan", inputs: { input: OutputRef(saw1), pan: 0.3 } }
out3: { device: "out", inputs: { input: OutputRef(pan2) } }
```

### Phase 2: Expansion

**Process saw1:**
Array in freq → expand to 3 nodes
```
saw1.0: { freq: 220 }
saw1.1: { freq: 330 }
saw1.2: { freq: 440 }
nodeMap: { saw1: ["saw1.0", "saw1.1", "saw1.2"] }
```

**Process pan2:**
- pan has `polyphonic: true` → don't duplicate
- Resolve input: OutputRef(saw1) → nodeMap gives ["saw1.0", "saw1.1", "saw1.2"]
- Input becomes array: [OutputRef(saw1.0), OutputRef(saw1.1), OutputRef(saw1.2)]
- Call pan.expand(config, { input: [...], pan: 0.3 })

**Inside pan.expand():**
```typescript
// input is array of 3 OutputRefs
if (isOutputRefArray(input) && input.length > 1) {
  // Create summer to sum 3 voices to mono
  const summer = createSummer(3);
  const sumNode = summer({ v0: input[0], v1: input[1], v2: input[2] });
  mono = { ref: sumNode.id, out: "signal" };  // e.g., _anon1
}

// Create L/R panners
const leftNode = panLeft({ input: mono, pan: panInput });   // references _anon1
const rightNode = panRight({ input: mono, pan: panInput }); // references _anon1

return [leftNode, rightNode];  // sumNode NOT returned!
```

**BUG:** sumNode created but not returned. collectExpandedNodes only adds leftNode and rightNode.

Graph now has nodes referencing `_anon1` which doesn't exist.

## Does VoiceRef Help Here?

No. This isn't a VoiceRef issue. It's about expand() creating internal nodes.

VoiceRef is about accessing voices symbolically:
```javascript
s.voices[0].saw()  // VoiceRef resolved at expansion
```

The pan bug is about expand() implementation:
```javascript
saw([...]).pan()  // No VoiceRef involved, just array propagation
```

## The Actual Fix Needed

**Option 1: pan.expand() returns ALL nodes**
```typescript
return [sumNode, leftNode, rightNode];  // Return internal node too
```

But then nodeMap would map pan2 → [sumNode, leftNode, rightNode], and downstream would see 3 outputs. Wrong.

**Option 2: expand() returns { outputs: [...], internal: [...] }**
```typescript
return {
  outputs: [leftNode, rightNode],
  internal: [sumNode]
};
```

expandPoly adds all to graph, but only outputs go in nodeMap.

**Option 3: collectExpandedNodes walks the graph**
```typescript
function collectExpandedNodes(result) {
  const outputs = Array.isArray(result) ? result : [result];
  const all = new Set<Node>();

  function walk(node) {
    if (all.has(node.id)) return;
    all.add(node);
    for (const input of Object.values(node.inputs)) {
      if (isOutputRef(input) && isInternalNode(input.ref)) {
        walk(getNodeById(input.ref));
      }
    }
  }

  outputs.forEach(walk);
  return { outputs, all: [...all] };
}
```

How do we know if a ref is "internal"? If it's not in the existing nodeMap, it must be internal to this expand().

**Option 4: Internal nodes get unique prefix**

expand-created nodes get prefix like `_expand_pan2_`:
```
_expand_pan2_sum: summer
_expand_pan2_left: panLeft
_expand_pan2_right: panRight
```

collectExpandedNodes scans returned nodes for refs to `_expand_*` and includes them.

## Cleanest Fix

Option 3 seems cleanest:
1. expand() contract unchanged (return output nodes)
2. collectExpandedNodes walks inputs of returned nodes
3. If input refs a node not in nodeMap, it's internal - include it
4. Continue walking until all internal refs found

```typescript
function collectExpandedNodes(result, existingNodeMap) {
  const outputs = Array.isArray(result) ? result : [result];
  const collected = new Map<NodeId, Node>();

  function walk(node: WrappedNode) {
    if (collected.has(node.id)) return;
    collected.set(node.id, extractNode(node));

    for (const input of Object.values(node.inputs)) {
      if (isOutputRef(input)) {
        // If ref points to something not in existing graph, it's internal
        if (!existingNodeMap.has(input.ref)) {
          const internalNode = findNodeById(input.ref);  // How?
          if (internalNode) walk(internalNode);
        }
      }
    }
  }

  outputs.forEach(walk);
  return {
    outputs: outputs.map(extractNode),
    all: [...collected.values()]
  };
}
```

**Problem:** How to find internal node by ID? The node exists (was created by anonymous device factory) but we don't have a reference to it.

Actually, we DO have a reference - it's in the WrappedNode. When sumNode is created:
```typescript
const sumNode = summer({ v0: ... });  // sumNode is WrappedNode
mono = { ref: sumNode.id, out: "signal" };
```

The WrappedNode IS the node. We just need to keep it accessible.

**Refined Option 3:**

expand() returns WrappedNodes. WrappedNode has `.inputs` which contain OutputRefs. Those OutputRefs point to IDs. But we need the actual node objects, not just IDs.

**New idea:** Track created nodes during expand execution.

```typescript
let expandContext: Node[] = [];

function runExpand(spec, config, inputs) {
  expandContext = [];
  const result = spec.expand(config, inputs);
  const outputs = Array.isArray(result) ? result : [result];
  // expandContext now contains all nodes created during expand
  return { outputs, allCreated: expandContext };
}

// In createNode (called by anonymous device):
function createNode(...) {
  const node = { ... };
  if (expandContext) expandContext.push(node);
  return node;
}
```

This captures ALL nodes created during expand(), including internal ones.

## Conclusion

VoiceRef doesn't help the pan bug. The pan bug is a separate issue about expand() creating internal nodes that get lost.

The fix is orthogonal to VoiceRef:
- Track all nodes created during expand() execution
- Add all of them to the graph
- Only map outputs to nodeMap for downstream reference

Both fixes are needed:
1. **VoiceRef** - for voice access syntax
2. **expand context tracking** - for internal node collection
