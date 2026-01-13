# Theory: Node Creation Paths

## Current State

Three ways to create nodes:

### 1. createDeviceNode (named devices)
```typescript
// device.ts line 87-91
const result = createDeviceNode(name, spec, inputs, config);
return wrap(result);
```
- Registers with builder
- Used by: named device factories like `saw()`, `lpf()`

### 2. createNode (anonymous devices)
```typescript
// device.ts line 80-84
const node = createNode(name, inputs, config);
return wrap(node);
```
- Does NOT register
- Used by: anonymous devices in expand hooks

### 3. createNode (wrap callable)
```typescript
// wrap.ts line 105-106
const newNode = createNode(target.device, {...}, target.config);
return wrap(newNode);
```
- Does NOT register
- Used by: `node(440)` callable syntax

## The Problem

Path 3 doesn't register, but it's user-facing (callable syntax).
If user does `saw(440)(880)`, the second node isn't in builder.

## Why Two Paths?

### Named devices register because:
- They're user-created, part of the "user graph"
- Downstream nodes reference them
- expandPoly processes them

### Anonymous devices don't register because:
- They're implementation details of expand()
- Created DURING expansion, shouldn't be re-expanded
- Only their outputs matter to the main graph

## The Conceptual Split

```
User Graph (registered)          Expansion Output (not registered)
─────────────────────           ──────────────────────────────────
saw(440)                        chordTone(440)
lpf(800)                        chordTone(554)
chord(440, "maj")        →      chordTone(659)
spread()                        leftMixer(...)
out()                           rightMixer(...)
```

Left side: what user wrote, goes through expansion.
Right side: what expansion produces, skips re-expansion.

## Alternative: Single Path with Flag

```typescript
createNode(device, inputs, config, { register: boolean })
```

Then:
- User-facing → `register: true`
- Expand output → `register: false`

## Alternative: Context-Based Registration

```typescript
const ctx = getCurrentContext();  // "api" | "expansion"
if (ctx === "api") builder.addNode(node);
```

During expansion, context is "expansion", so nodes don't register.

## Alternative: No Registration at All

What if builder didn't exist? Nodes just reference each other by ID.

Graph collected by walking from `out()` nodes backward.

### Pros
- Simpler model
- No registration confusion

### Cons
- How to find all out nodes?
- Disconnected nodes silently disappear

## Key Question

**Is the builder necessary?**

Currently it's a "bag of nodes". expandPoly walks it.

If we collected by walking from outputs:
- `out()` adds itself to a list
- Expansion walks backward from outs
- Unreferenced nodes naturally excluded

## Test: What if we removed builder?

```javascript
let osc = saw(440)  // Creates node, not registered anywhere
osc.out()           // out() walks backward, finds saw
```

Works. But what about:
```javascript
let osc = saw(440)  // Creates node
// osc never connected to out
// Node disappears - is this a bug or feature?
```

In modular synths, unpatched modules do nothing. Same here?

## Questions

1. Should unreferenced nodes be an error or silently ignored?
2. Can we eliminate the builder entirely?
3. Is the real problem that registration is implicit?
