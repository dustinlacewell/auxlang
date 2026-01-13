# Device Implementation Details

How would each device type actually be implemented?

## Question 1: What makes a device "poly-outputting"?

Current system: A node has array in its inputs → expansion duplicates it → nodeMap maps original ID to multiple IDs.

So "poly output" isn't a device property. It's a **graph property** - whether nodeMap[id].length > 1.

A device becomes poly-outputting when:
1. It has an array in an input (e.g., `saw([220, 330])`)
2. OR its expand() returns multiple nodes (e.g., `chord`)
3. OR upstream is poly and device gets duplicated

## Question 2: What is poly()?

poly() is a regular device. Nothing special about it.

```typescript
const poly = device("poly", {
  inputs: inputs({ input: 0 }),
  outputs: ["signal"],
  defaultInput: "input",
  defaultOutput: "signal",
  process(inp) {
    return { signal: inp.input as number };
  },
});
```

When called with array:
```javascript
poly([saw(220), saw(330)])
```

- input = `[OutputRef(saw1), OutputRef(saw2)]`
- Array in input → expansion duplicates poly node
- poly.0 passes through saw1, poly.1 passes through saw2
- Downstream sees poly as 2 voices via nodeMap

**poly() works exactly like every other device.** Chaining works:
```javascript
poly([saw(220), saw(330)]).lpf(800).spread().out()
```

## Question 3: Bare arrays

```javascript
[saw(220), saw(330)].spread()  // Bare JS array
```

JS arrays don't have `.spread()`. Two options:

### Option A: Require poly() wrapper
```javascript
poly([saw(220), saw(330)]).spread()
```

### Option B: AST transformation (future enhancement)
Parse user code, wrap bare arrays in poly() automatically.

For now, Option A is fine. poly() is the explicit way to create a chainable poly signal from an array of descriptors.

## The Key Scenarios

### Scenario 1: Array in device input
```javascript
saw([220, 330]).lpf(800).spread().out()
```
- saw node has freq: [220, 330]
- Expansion duplicates saw → saw.0, saw.1
- lpf receives poly upstream → lpf.0, lpf.1
- spread receives poly upstream → creates L/R mixers
- Works ✓

### Scenario 2: Explicit poly from separate descriptors
```javascript
poly([saw(220), tri(330)]).spread().out()
```
- poly node has input: [OutputRef(saw), OutputRef(tri)]
- Expansion duplicates poly → poly.0 (from saw), poly.1 (from tri)
- spread receives poly upstream → creates L/R mixers
- Works ✓

### Scenario 3: VoiceRef per-voice processing
```javascript
let s = seq("{c4, e4, g4}")
poly([
  s.voices[0].saw(),
  s.voices[1].tri(),
  s.voices[2].sin()
]).spread().out()
```
- Each voices[i] returns VoiceRef
- Chaining from VoiceRef creates descriptor with VoiceRef as input
- poly collects them into array
- Expansion: seq expands to 3, VoiceRefs resolve, poly duplicates
- Works ✓

### Scenario 4: Method setters on poly
```javascript
poly([saw(220), saw(330)]).gain(0.5).lpf(800)
```
- poly returns WrappedNode (single node with array input)
- .gain() chains normally
- .lpf() chains normally
- All device syntax works uniformly ✓

## poly() is NOT special

| Feature | poly() | saw() | lpf() |
|---------|--------|-------|-------|
| Positional args | ✓ | ✓ | ✓ |
| Object args | ✓ | ✓ | ✓ |
| Method setters | ✓ | ✓ | ✓ |
| Chaining | ✓ | ✓ | ✓ |
| Array input | ✓ | ✓ | ✓ |

All devices work the same way. poly() just happens to be a pass-through whose purpose is bundling separate signals into a poly signal.

## Implementation

```typescript
export const poly = device("poly", {
  inputs: inputs({ input: 0 }),
  outputs: ["signal"],
  defaultInput: "input",
  defaultOutput: "signal",
  positionalArgs: ["input"],
  process(inp) {
    return { signal: inp.input as number };
  },
});
```

That's it. The array expansion mechanism does the rest.
