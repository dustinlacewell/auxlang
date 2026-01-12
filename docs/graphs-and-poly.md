# Graphs and Polyphony

This document explains how Auxlang builds, compiles, and executes audio graphs—with particular attention to how polyphony works at each stage.

## The Two Worlds

Auxlang has two distinct execution phases:

1. **Build time** — JavaScript runs, creating descriptors that form a DAG
2. **Runtime** — The DAG is compiled and executed sample-by-sample in an AudioWorklet

Understanding this split is essential. Polyphony can be resolved at either phase, and the choice determines what's possible.

---

## Build Time: Descriptors and the DAG

### What is a Descriptor?

A descriptor is a *lazy specification* of a device instance. When you write:

```javascript
saw(440)
```

No audio is generated. Instead, you get a descriptor object containing:
- A unique ID (e.g., `"d1"`)
- A device spec (inputs, outputs, process function)
- Input bindings (e.g., `{ pitch: 440 }`)
- Config bindings (e.g., `{ shape: "saw" }`)

Descriptors are immutable. Every method call returns a *new* descriptor:

```javascript
let a = saw(440)
let b = a.pitch(880)  // b is new, a unchanged
```

This matters because `a` and `b` have different IDs and different bindings. They're separate nodes in the graph.

### Descriptor vs AnyDescriptor

In the TypeScript code, you'll see two descriptor types:

- **`Descriptor<I, C, O>`** — Fully typed with specific input/config/output names as type parameters. This is what device factories return, giving you autocomplete for `.pitch()`, `.out`, etc.

- **`AnyDescriptor`** — The untyped base interface. Internal code that handles descriptors generically uses this when the specific input/output names aren't known or relevant.

They're the same runtime object—just different type-level views of it.

### How Inputs Get Bound

When you call a device, arguments flow through a binding process:

1. **Positional args** are consumed in order based on `positionalArgs` config
2. **Object params** (like `{ cutoff: 800 }`) set named inputs
3. **Chained signals** (from `.method()` syntax) bind to the default input

For example, `lpf(audio).cutoff(800)` creates a descriptor where `input` is bound to `audio` and `cutoff` is bound to `800`.

### Signal Types (User-Facing)

When calling a device, you can pass several signal types:

| Type | Example | What It Means |
|------|---------|---------------|
| `number` | `440` | Constant value |
| `OutputRef` | `saw(440).out` | Explicit reference to a node's output |
| `AnyDescriptor` | `saw(440)` | Shorthand for that descriptor's default output |
| `SignalLambda` | `(s, sr, t) => Math.sin(t)` | Inline per-sample function |
| `PolyDescriptor` | `poly([saw(220), saw(440)])` | Multiple parallel signals |

### Normalization at Binding Time

Here's a key implementation detail: **descriptors are normalized to OutputRefs when bound**.

When you write `lpf(saw(440))`, the saw descriptor doesn't get stored directly. Instead, at binding time, it's converted to an OutputRef pointing to saw's default output:

```javascript
// What you write:
lpf(saw(440))

// What gets stored in lpf's inputBindings:
{ input: { descriptorId: "d1", outputName: "out" } }
```

This normalization happens in `createDescriptor()`. The `Signal` type (user-facing) includes `AnyDescriptor`, but `BoundSignal` (what's stored in `inputBindings`) does not.

Why normalize early? It simplifies reify—there's only one connection type to handle. The descriptor registry still exists for looking up descriptors by ID, but signals in bindings are always OutputRefs.

Similarly, `PolyDescriptor` gets normalized to `BoundPoly`, where voices are OutputRefs instead of full descriptors.

---

## Build-Time Polyphony: The `poly()` Wrapper

A `PolyDescriptor` wraps multiple mono descriptors:

```javascript
let chord = poly([saw(220), saw(330), saw(440)])
```

This creates a poly with three "voices." Each voice is a separate descriptor with its own ID.

### Poly Propagation

The magic of poly is that method calls propagate to each voice:

```javascript
chord.lpf({ cutoff: 800 })
```

This doesn't create one filter. It creates *three* filters—one for each voice—wrapped in a new poly. The proxy handler in `poly.ts` intercepts the `.lpf()` call and:

1. Looks up the `lpf` device factory
2. Checks if `lpf` is a polyphonic device (more on this later)
3. If not, creates a new `lpf` for each voice, wiring each voice's default output to each filter's input
4. Returns a new poly containing the three filters

This is **per-voice expansion**. The poly is a container that distributes method calls.

### Per-Voice Parameter Distribution

When you pass parameters to a chained method, they can be distributed:

```javascript
// Array param: each voice gets one value (with wraparound)
chord.lpf({ cutoff: [800, 1200, 1600] })

// Poly param: each voice gets corresponding voice
let mods = poly([lfo(1), lfo(2), lfo(3)])
chord.lpf({ cutoff: mods })

// Scalar param: all voices get the same value
chord.lpf({ cutoff: 800 })
```

The `resolveForVoice()` function handles this:
- Arrays index by voice number (mod length)
- Polys extract the matching voice (mod length)
- Scalars pass through unchanged

---

## Polyphonic Devices: Breaking the Expansion Pattern

Normal devices get expanded per-voice. But some devices need to *see all voices at once*. These are **polyphonic devices**, marked with `polyphonic: true`.

### Example: The `spread` Device

`spread` takes N voices and outputs 2 voices (left and right channels). It needs to know how many voices exist and their positions to calculate pan gains.

When the poly proxy encounters a polyphonic device:

```javascript
// In poly.ts proxy handler:
if (deviceSpec?.polyphonic) {
  // Pass the entire poly as the default input
  return deviceFactory(thisPoly, params)
}
```

Instead of creating N devices, it creates *one* device and passes the poly directly.

### The `expand` Function

Polyphonic devices use an `expand` function that runs at build time:

```javascript
expand(_config, inputBindings) {
  const input = inputBindings.input  // This is the PolyDescriptor
  const voices = input.voices        // Array of mono descriptors

  // ... compute new graph structure ...

  return poly([leftMix, rightMix])   // Return transformed poly
}
```

The expand function receives the raw input bindings and returns a new descriptor (or poly). This is **graph rewriting**—the spread device doesn't exist at runtime. It's replaced by the descriptors created in expand.

### What `spread` Actually Creates

For three voices, spread's expand function creates:

```
Voice 0 (pan -1) ─┬─ mult by leftGain ──┐
Voice 1 (pan  0) ─┼─ mult by leftGain ──┼─ add ─┬─ Left output
Voice 2 (pan +1) ─┴─ mult by leftGain ──┘       │
                                                 │
Voice 0 (pan -1) ─┬─ mult by rightGain ─┐       │
Voice 1 (pan  0) ─┼─ mult by rightGain ─┼─ add ─┼─ Right output
Voice 2 (pan +1) ─┴─ mult by rightGain ─┘       │
```

Each gain is computed using signal math (`mult`, `sub`, `add` devices) so that the `width` parameter can be modulated at runtime.

This is **build-time polyphony resolution**. The N-to-2 reduction happens when the graph is constructed, not when audio runs.

---

## Another Pattern: The `chord` Device

`chord` is the inverse of `spread`—it takes one signal and outputs N signals:

```javascript
seq("c3 f3").chord("maj7").saw()
```

The expand function:

```javascript
expand(config, _inputBindings) {
  const semitones = CHORD_SEMITONES[config.chordName]  // e.g., [0, 4, 7, 11]
  const voices = semitones.map(semi => createChordVoice(semi))
  return poly(voices)
}
```

Here, `chord` doesn't even look at `inputBindings`. It creates voice devices based purely on config. The input (root frequency) gets wired later when the returned poly's voices receive the chained signal.

---

## Reification: Building the Runtime Graph

When you call `.out()`, the descriptor DAG gets **reified** into a runtime `Graph`.

### Walking the DAG

The `reify()` function walks backwards from the output:

```javascript
function visit(descriptor) {
  // Skip if already visited
  if (visited.has(id)) return

  // Visit dependencies first (inputs that are connections)
  // Note: bindings are already normalized, so we only see OutputRefs, not descriptors
  for (const [inputName, binding] of inputBindings) {
    if (isOutputRef(binding)) {
      visit(getDescriptor(binding.descriptorId))
    }
    if (isBoundPoly(binding)) {
      for (const ref of binding.voices) {
        visit(getDescriptor(ref.descriptorId))
      }
    }
  }

  // Then add this node
  nodes.push({ id, spec, resolvedInputs, resolvedConfig })
}
```

The result is an array of `GraphNode` objects in **topological order**—dependencies before dependents.

### Resolving Inputs

Because signals are normalized at binding time, reify only sees `BoundSignal` types. Each becomes a `ResolvedInput`:

| BoundSignal Type | Resolved To |
|------------------|-------------|
| `number` | `{ type: "constant", value: 440 }` |
| `OutputRef` | `{ type: "connection", nodeId: "d1", output: "cv" }` |
| `SignalLambda` | `{ type: "lambda", fn: ... }` |
| `BoundPoly` | `{ type: "connections", sources: [...] }` |

That last one—`connections` (plural)—is for **runtime polyphonic devices** that use `processAll`. More on this below.

---

## Stereo Output

The `out()` system collects all output descriptors and builds stereo graphs:

```javascript
collectStereoGraph() {
  if (outputs.length === 1) {
    // Mono: same graph for both channels
    return { left: reify(outputs[0]), right: reify(outputs[0]) }
  }
  if (outputs.length === 2) {
    // Stereo: direct L/R mapping
    return { left: reify(outputs[0]), right: reify(outputs[1]) }
  }
  // N outputs: round-robin (evens=left, odds=right) with mixing
}
```

When `spread` outputs a 2-voice poly, `.out()` unpacks those voices and sends voice 0 to left, voice 1 to right.

---

## Compilation: Preparing for the Worklet

The `Graph` is JavaScript objects with live references. The AudioWorklet runs in a separate thread and can't receive this directly. The `compile()` function serializes everything:

1. **Process functions** become source strings (for `eval` on the worklet)
2. **Lambdas** become source strings
3. **Config functions** become source strings
4. **WASM modules** become `ArrayBuffer` bytes
5. **Connections** become node ID + output name pairs

The result is a `CompiledGraph` that can be sent via `postMessage`.

---

## Runtime: The RuntimeGraph

The AudioWorklet receives the compiled graph and builds a `RuntimeGraph`:

### Hydration

Each compiled node gets "hydrated":

1. Process source string → actual function via `new Function()`
2. Lambda source strings → actual functions
3. Config function sources → actual functions
4. Node IDs → array indices (for fast lookup)

### The Process Loop

Every sample, `processSample()` runs:

```javascript
for (const node of nodesInTopologicalOrder) {
  // 1. Resolve inputs
  for (const binding of node.inputBindings) {
    if (binding.type === "constant") {
      inputRecord[name] = binding.value
    } else if (binding.type === "connection") {
      inputRecord[name] = nodes[binding.sourceIndex].outputRecord[binding.output]
    } else if (binding.type === "lambda") {
      inputRecord[name] = binding.fn(binding.state, sampleRate, time)
    } else if (binding.type === "connections") {
      inputRecord[name] = binding.sources.map(s =>
        nodes[s.sourceIndex].outputRecord[s.output]
      )
    }
  }

  // 2. Call process
  const result = node.process(inputRecord, config, state, sampleRate, time)

  // 3. Store outputs
  for (const output of node.outputNames) {
    outputRecord[output] = result[output]
  }
}

return outputNode.outputRecord[defaultOutput]
```

All allocations happen at construction. The loop only mutates pre-allocated objects.

---

## Runtime Polyphony: processAll

Some devices can't be resolved at build time. Consider a hypothetical `voiceSelect`:

```javascript
voiceSelect(poly3voices, selectorSignal)
// selector changes every sample, picking different voice
```

The selection depends on a runtime signal value. Build-time expansion can't help.

For these cases, the device can define `processAll`:

```javascript
{
  polyphonic: true,
  processAll(inputs, config, state, sampleRate, time) {
    const voices = inputs.input   // number[] - gathered from all source nodes
    const selector = inputs.select // number
    const idx = Math.floor(selector) % voices.length
    return { out: voices[idx] }
  }
}
```

At runtime, when the RuntimeGraph encounters a `connections` binding, it gathers values from all source nodes into an array and passes it to `processAll`.

### When to Use Each Pattern

| Pattern | Mechanism | When to Use |
|---------|-----------|-------------|
| `expand` | Build-time graph rewrite | Output structure known at build time |
| `processAll` | Runtime array processing | Output depends on runtime signal values |

`spread` uses `expand` because it always outputs 2 voices (L/R), and the pan gains can be computed via signal math (width is wired as a signal, not read at build time).

`voiceSelect` would use `processAll` because which voice to output is only known at runtime.

---

## The Bug We Fixed

When implementing `spread`, we hit a subtle bug. After `expand` returned its poly, device.ts had code that re-applied input bindings:

```javascript
// WRONG - this was the bug
let result = expandFn(config, inputBindings)
for (const [key, value] of inputBindings) {
  if (typeof result[key] === "function") {
    result = result[key](value)  // Re-applies inputs!
  }
}
```

So if `expand` returned `poly([leftMix, rightMix])`, this code would call `result.input(originalPoly)`, which the poly proxy interpreted as setting the input on each voice—creating *new* descriptors with wrong IDs.

The fix: remove the post-expand input re-application. The expand function already consumes inputs; it doesn't need them applied again.

---

## Summary

1. **Descriptors** are lazy specs forming a DAG
2. **Poly** wraps multiple descriptors and propagates method calls per-voice
3. **Polyphonic devices** (`polyphonic: true`) receive the poly instead of being expanded
4. **expand** rewrites the graph at build time—the device is replaced by what expand returns
5. **processAll** handles polyphony at runtime when reduction depends on signal values
6. **reify** walks the DAG and builds a flat node array in topological order
7. **compile** serializes everything for the worklet thread
8. **RuntimeGraph** processes the graph sample-by-sample with zero allocation

The key insight: decide whether polyphony is resolved at build time (graph structure) or runtime (signal processing). Build-time is simpler and more efficient. Runtime is more flexible.
