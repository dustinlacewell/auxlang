# Entity: Node

Source: `src/core2/graph/node.ts`

## Definition

```typescript
interface Node {
  readonly id: NodeId;        // string identifier
  readonly device: string;    // name of device type
  readonly inputs: Record<string, NodeInput>;  // named input bindings
  readonly config: Record<string, ConfigValue>; // static configuration
}
```

## Observations

1. **Plain data object** - No behavior, no proxy, just data
2. **Device is a reference** - String name, looked up in registry separately
3. **Separation of inputs vs config**:
   - `inputs` - can be signals (dynamic, connected to other nodes)
   - `config` - static values (set at creation, don't change)
4. **No output information** - Node doesn't know its own outputs, that's in DeviceSpec
5. **No voice/poly information** - Node has no concept of how many voices it represents
6. **Immutable** - All fields readonly

## Questions Raised

- What is NodeInput? (→ investigate node-input.ts)
- What is ConfigValue? (→ investigate config-value.ts)
- How does id get assigned?
- Can inputs contain arrays? (poly sources)
- Is a Node always 1:1 with a runtime computation unit?

## Key Insight

A Node is a **static description** of a computation, not the computation itself.
It says "this device with these inputs and this config" but doesn't execute.

## Implications for Poly

The Node structure has NO inherent poly concept. Any poly handling must be:
- Encoded in inputs (arrays?)
- Handled by creating multiple nodes
- Managed externally (graph structure, metadata)
