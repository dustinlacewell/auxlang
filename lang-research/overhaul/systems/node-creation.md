# System: Node Creation

Three files involved in creating nodes:
- `src/core2/graph/create-node.ts`
- `src/core2/device/create-device-node.ts`
- `src/core2/device/device.ts`

---

## create-node.ts - Raw Node Creation

```typescript
let nodeCounter = 0;

function createNode(device, inputs, config): Node {
  const id = `${device}${++nodeCounter}`;
  return { id, device, inputs, config };
}
```

**What it does**:
- Assigns sequential ID like "saw1", "lpf2"
- Creates plain Node object
- Does NOT register anywhere

**Who calls it**:
- `createDeviceNode` (then registers)
- Anonymous device factories (no registration)
- Wrap callable handler (BUG - should register)

---

## create-device-node.ts - Registered Node Creation

```typescript
function createDeviceNode(deviceName, _spec, inputs, config): Node {
  const node = createNode(deviceName, inputs, config);
  getBuilder().addNode(node);  // <-- Registration
  return node;
}
```

**What it does**:
- Calls createNode
- Registers with builder
- Returns same node

**Who calls it**:
- Named device factories
- Wrap input setters (after fix)
- Wrap chaining methods
- Wrap out() method

**Note**: The `_spec` parameter is unused! It's passed but never read.

---

## device.ts - Factory Creation

Two overloads:
```typescript
device(name: string, spec): DeviceFactory  // Named
device(spec): DeviceFactory                 // Anonymous
```

### Named Device Factory (line 85-91)
```typescript
factory = (...args) => {
  const { inputs, config } = parseFactoryArgs(args, spec, positionalArgs);
  const result = createDeviceNode(name, spec, inputs, config);
  return wrap(result);
};
```
**Behavior**: Creates node → registers → wraps → returns

### Anonymous Device Factory (line 78-84)
```typescript
factory = (...args) => {
  const { inputs, config } = parseFactoryArgs(args, spec, positionalArgs);
  const node = createNode(name, inputs, config);  // <-- NO registration
  return wrap(node);
};
```
**Behavior**: Creates node → wraps → returns (NO registration)

### Both Register with Device Registry
```typescript
registerDevice(name, factory, spec);  // Line 94
```

Even anonymous devices get registered as `_anon1`, `_anon2`, etc.
This is for spec lookup, not for chaining.

---

## The Four Node Creation Paths

| Path | Creates | Registers | Used For |
|------|---------|-----------|----------|
| Named factory | Node | Yes | `saw(440)` |
| Anonymous factory | Node | No | `chordTone(...)` in expand |
| Input setter | Node | Yes (now) | `.freq(440)` |
| Wrap callable | Node | **NO (BUG)** | `node(440)` |

---

## ID Assignment

IDs are assigned by `createNode`:
- Global counter: `nodeCounter`
- Format: `{deviceName}{counter}`
- Examples: "saw1", "lpf2", "_anon3"

**Reset during expandPoly**:
```typescript
// expand-poly.ts line 35
resetNodeCounter();
```

This makes expansion IDs deterministic, but means:
- API-created nodes: saw1, saw2, saw3
- Expansion-created nodes: seq1, seq2 (counter reset!)

ID collision possible? No - expand creates new nodes with different device names usually.

---

## The Registration Gap

The inconsistency is in WRAP, not device.ts:

**wrap.ts line 102-107 (callable handler)**:
```typescript
apply(target, _thisArg, args) {
  const [value] = args;
  const newNode = createNode(...);  // <-- NO registration!
  return wrap(newNode);
}
```

This is `node(440)` syntax - sets default input.
Creates a node but doesn't register it.

**Compare to input setter (wrap.ts line 82-90)**:
```typescript
if (prop in spec.inputs) {
  return (value: NodeInput) => {
    const newNode = createDeviceNode(...);  // Registers!
    return wrap(newNode);
  };
}
```

---

## Summary

**The issue is not in node creation functions.**

It's in the CALLERS:
1. Named device factory → uses createDeviceNode ✓
2. Anonymous device factory → uses createNode (intentional) ✓
3. Wrap input setter → uses createDeviceNode ✓
4. Wrap callable → uses createNode **✗ BUG**

The callable handler should use createDeviceNode because:
- It's user-facing API
- The new node may be referenced by downstream
- It's equivalent to input setter, just different syntax

---

## Questions

1. Why does createDeviceNode take `_spec` if it never uses it?
2. Should anonymous devices skip registration? What if expand needs to reference them?
3. Is the callable `node(440)` syntax actually used anywhere?
4. If callable is rarely used, maybe just remove it?
