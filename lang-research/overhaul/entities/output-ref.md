# Entity: OutputRef

Source: `src/core2/graph/output-ref.ts`

## Definition

```typescript
interface OutputRef {
  readonly ref: NodeId;  // ID of source node
  readonly out: string;  // Name of output on that node
}
```

## Observations

1. **Just a pointer** - References a node by ID and names an output
2. **No value** - Doesn't contain the signal, just points to where it comes from
3. **Node must exist** - The `ref` must point to a valid node ID
4. **Output must exist** - The `out` must be a valid output name for that device
5. **Immutable** - Both fields readonly

## Graph Edges

OutputRef is how the graph is connected:
- Node A's input contains `{ ref: "nodeB", out: "cv" }`
- This creates an edge: B.cv → A.input

## Questions Raised

- What happens if `ref` points to a node that doesn't exist?
- What happens if `out` names an output that doesn't exist?
- During expansion, how are OutputRefs remapped?

## Key Insight

**OutputRef is a symbolic reference, not a direct pointer.**

The graph is connected by names/IDs, not by object references.
This means:
- Nodes can be created in any order
- Graph structure is data, can be serialized
- Expansion can rewrite refs by string manipulation

## Implications for Poly

When a node expands to multiple nodes:
- The original ID (e.g., "chord1") maps to multiple new IDs ("_anon1", "_anon2", "_anon3")
- Downstream OutputRefs pointing to "chord1" must be rewritten
- This is what `nodeMap` in expandPoly does

But: OutputRef itself has NO concept of poly. It points to ONE node.
Poly is represented by having MULTIPLE OutputRefs (OutputRef[]).
