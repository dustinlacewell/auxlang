# Entity: GraphBuilder

Source: `src/core2/graph/graph-builder.ts`

## Definition

```typescript
class GraphBuilder {
  private nodes: Map<NodeId, Node> = new Map();

  addNode(node: Node): void {
    this.nodes.set(node.id, node);
  }

  build(): FlatGraph {
    return { nodes: Array.from(this.nodes.values()) };
  }
}
```

## Observations

1. **Global singleton** - `getBuilder()` returns shared instance
2. **Simple accumulator** - Just collects nodes by ID
3. **No validation** - Doesn't check if refs are valid
4. **No ordering** - Map preserves insertion order but that's incidental
5. **Reset between evaluations** - Fresh builder each time

## Key Operations

| Operation | What it does |
|-----------|--------------|
| `addNode(node)` | Store node by ID |
| `build()` | Return all nodes as FlatGraph |
| `resetBuilder()` | Create fresh empty builder |

## What It Doesn't Do

- No topological sorting (that's in expandPoly)
- No validation of connections
- No poly handling
- No transformation of nodes
- No tracking of what added what

## FlatGraph

```typescript
interface FlatGraph {
  nodes: Node[];
}
```

That's it. Just a list of nodes.

## Questions Raised

- Who calls addNode? (→ investigate callers)
- What's the lifecycle: reset → add → add → build?
- Why is there no "graph" structure - just flat list?
- How are connections validated?

## Key Insight

**GraphBuilder is a dumb bag of nodes.**

It has no graph semantics. The "graph" structure is implicit:
- Nodes reference each other via OutputRef
- Connections aren't validated until later
- The graph shape is discovered during topological sort

## Implications

The current architecture:
1. API creates nodes, adds to builder (unordered)
2. `build()` returns flat list
3. `expandPoly` processes, sorts, transforms
4. Result goes to compile

The builder is just Phase 1 output collector. All intelligence is elsewhere.

## Current Problem Location

The issue with input setters creating unregistered nodes:
- `saw(440)` calls `createDeviceNode` → adds to builder
- `.freq(550)` calls `createNode` → does NOT add to builder
- Downstream refs point to non-existent nodes
