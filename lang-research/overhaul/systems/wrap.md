# System: Wrap (Fluent API Layer)

Source: `src/core2/wrap/wrap.ts`

## Purpose

Wraps plain Node objects with Proxy behavior enabling:
- Method chaining: `saw(440).lpf(800).gain(0.5)`
- Input setters: `node.freq(440)`
- Output access: `node.cv`
- Device chaining: `node.lpf()`

## Two Wrapper Types

### WrappedNode
```typescript
interface WrappedNode extends Node {
  (value: NodeInput): WrappedNode;  // callable for default input
  out(): void;                       // terminal
  [key: string]: unknown;            // dynamic props
}
```

### WrappedArray
```typescript
interface WrappedArray extends Array<Node> {
  (value: NodeInput): WrappedArray;  // maps across
  out(): void;                        // creates out nodes
  [key: string]: unknown;             // maps methods
}
```

## Proxy Behaviors (WrappedNode)

| Access Pattern | What Happens |
|----------------|--------------|
| `node.id` | Pass through Node property |
| `node.out()` | Create and register out node |
| `node.apply(fn)` | Call fn with wrapped node |
| `node.cv` | Return ChainableOutputRef |
| `node.freq(440)` | Create new node with input set, register it |
| `node.lpf()` | Create new lpf node chained to this, register it |
| `node(440)` | Create new node with default input set |

## Node Creation Points

### 1. Input Setter (line 82-90)
```typescript
if (prop in spec.inputs) {
  return (value: NodeInput) => {
    const newNode = createDeviceNode(...);  // REGISTERS with builder
    return wrap(newNode);
  };
}
```
**Creates and registers** new node with modified input.

### 2. Device Chaining (line 118+)
```typescript
function createChainMethod(...) {
  const result = createDeviceNode(...);  // REGISTERS with builder
  return wrap(result);
}
```
**Creates and registers** new device node.

### 3. Callable Default Input (line 102-107)
```typescript
apply(target, _thisArg, args) {
  const newNode = createNode(...);  // Does NOT register!
  return wrap(newNode);
}
```
**Creates but does NOT register** - this is a BUG or intentional?

### 4. out() (line 56-67)
```typescript
const outNode = createDeviceNode(...);
getBuilder().addNode(outNode);  // Explicitly registers
```
**Creates and registers** out node.

## Current Inconsistency

Three different patterns for node creation:
1. `createDeviceNode` → Registers ✓
2. `createNode` → Does NOT register ✗
3. `createDeviceNode` + explicit `addNode` → Redundant?

## WrappedArray Behavior

When wrapping array of nodes:
- Property access maps across all nodes
- Creates new WrappedArray with results
- Voice count = array length

```typescript
// poly.freq(440) creates:
// - poly[0].freq(440) → new node
// - poly[1].freq(440) → new node
// Returns WrappedArray of new nodes
```

## Questions Raised

- Why does callable (`node(440)`) use `createNode` instead of `createDeviceNode`?
- Is the out() explicit addNode redundant with createDeviceNode's registration?
- How does WrappedArray interact with poly expansion?
- What happens when user doesn't call out()? Orphan nodes?

## Key Insight

**wrap.ts is the API-time behavior layer.**

It intercepts user actions and creates nodes.
But it has inconsistent node creation:
- Some paths register with builder
- Some paths don't

This creates the "missing node" bugs we're seeing.

## Implications for Architecture

The wrap layer conflates:
1. **User ergonomics** - Method syntax
2. **Node creation** - Making Node objects
3. **Graph building** - Registering with builder

These might want to be separated.
