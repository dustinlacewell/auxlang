# Device Taxonomy

A systematic categorization of device types by their poly behavior.

**Confirmed from codebase search:**
- `polyphonic: true` devices: spread, pan (only 2)
- `expand` devices: chord, seq, spread, pan (4 total)

---

## Category 1: Passthrough (No Special Poly Handling)

**Behavior**: Device has no `polyphonic` flag, no `expand` hook.
When upstream is poly, device is **duplicated** by expandPoly.

**Confirmed Examples**:
- Oscillators: osc, sin, saw, tri, sqr, noise
- Filters: lpf, hpf, bpf, notch
- Effects: gain, delay, reverb, tape, slew, sah
- Envelopes: adsr, ar, ad
- Math: scale, add (and all math devices)
- Timing: clock, clockDiv, clockMult, counter
- Utilities: pick, quantize

**Input/Output signature**: 1 voice in → 1 voice out
**Poly handling**: External (expandPoly duplicates)

**What happens with poly input**:
- `saw([440, 550])` → expandPoly creates saw.0 and saw.1
- Each copy gets one frequency

---

## Category 2: Aggregator (Fixed Multi-Input)

**Behavior**: Device has fixed number of named inputs, combines them.
NOT polyphonic, no expand.

**Confirmed Examples**: mix

**Input/Output signature**: N fixed inputs → 1 voice out
**Poly handling**: Device gets duplicated if ANY input is poly

```typescript
// mix.ts - NOT polyphonic, no expand
device("mix", {
  inputs: inputs({ a: 0, b: 0, c: 0, d: 0 }),
  process(inp) {
    return { signal: (a + b + c + d) * scale };
  }
})
```

**Behavior with poly**:
- If mix.a is poly(3), mix gets duplicated 3 times
- mix.0 gets a[0], mix.1 gets a[1], mix.2 gets a[2]
- Mono inputs (b, c, d) broadcast to all copies

---

## Category 3: Semantic Expander (Domain Knowledge)

**Behavior**: Device has `expand` hook, NOT `polyphonic`.
Uses domain knowledge to create multiple nodes.

**Confirmed Examples**: chord, seq

**Input/Output signature**: 1 config → N voices out (N from config)

### chord.ts
```typescript
device("chord", {
  // NO polyphonic flag
  expand(config, inputBindings) {
    const semitones = CHORD_SEMITONES[config.chordName];
    return semitones.map(semi =>
      chordTone({ root: inputBindings.root }, { semi })
    );
  }
})
```

### seq.ts
```typescript
device("seq", {
  // NO polyphonic flag
  expand(config, inputBindings) {
    const expr = parseExpr(config.pattern);
    const voices = voiceCount(expr);
    if (voices === 1) {
      return wrap(createNode("seq", ...));
    }
    // Poly pattern - decompose
    return monoExprs.map(monoExpr =>
      wrap(createNode("seq", { expr: monoExpr }))
    );
  }
})
```

**Key characteristic**:
- Voice count determined by CONFIG, not input
- chord("maj") → 3 voices, chord("dom7") → 4 voices
- seq("{c4,e4,g4}") → 3 voices, seq("c4 d4 e4") → 1 voice

---

## Category 4: Topology Transformer (N → 2)

**Behavior**: Device is `polyphonic: true` AND has `expand` hook.
Receives N poly voices, outputs exactly 2 (L/R stereo).

**Confirmed Examples**: spread, pan (the ONLY two polyphonic devices)

**Input/Output signature**: N voices in → 2 voices out (L/R)

### spread.ts
```typescript
device("spread", {
  polyphonic: true,  // <-- prevents duplication
  expand(config, inputBindings) {
    const voices = isOutputRefArray(input) ? input : [input];
    const n = voices.length;
    const leftMixer = createMixer(n, true);
    const rightMixer = createMixer(n, false);
    return [leftNode, rightNode];
  }
})
```

### pan.ts
```typescript
device("pan", {
  polyphonic: true,  // <-- prevents duplication
  expand(_config, inputBindings) {
    // Sum poly input to mono, then pan
    const summer = createSummer(input.length);
    const leftNode = panLeft({ input: mono, pan: panInput });
    const rightNode = panRight({ input: mono, pan: panInput });
    return [leftNode, rightNode];
  }
})
```

**Key characteristic**:
- `polyphonic: true` prevents N copies being made
- expand() receives poly inputs as OutputRef[]
- Always creates exactly 2 output nodes (L/R)

---

## Category 5: Poly Passthrough (polyphonic without expand)

**Behavior**: Device is `polyphonic: true`, NO `expand` hook.
Would receive poly inputs without duplication.

**Confirmed Examples**: NONE

This category is theoretical. No devices currently use this pattern.

If used, the device's `process()` would need to handle array inputs,
which isn't how the current runtime works.

---

## Summary Table

| Category | polyphonic | expand | Count | Examples |
|----------|------------|--------|-------|----------|
| Passthrough | ✗ | ✗ | ~25+ | osc, lpf, gain, etc |
| Aggregator | ✗ | ✗ | 1 | mix |
| Semantic Expander | ✗ | ✓ | 2 | chord, seq |
| Topology Transformer | ✓ | ✓ | 2 | spread, pan |
| Poly Passthrough | ✓ | ✗ | 0 | (none) |

---

## Key Observations

1. **polyphonic is rare** - Only spread and pan use it
2. **polyphonic always has expand** - No device is polyphonic without expand
3. **expand without polyphonic** - chord and seq expand but get duplicated normally
4. **Topology transformers output stereo** - Both spread and pan output exactly 2 nodes

---

## Answered Questions

1. ~~Is Category 5 (Poly Passthrough) actually used?~~ **No**
2. ~~Can a device be Category 3 AND Category 4?~~ **No - they have different polyphonic settings**
3. ~~What about devices that REDUCE poly? (N → 1)~~ **pan with poly input sums to mono first**
4. What about devices that MULTIPLY poly? (N → N*M) - **No examples found**

---

## The Actual Pattern

Looking at the confirmed data, there are really only 3 patterns:

1. **Normal devices** - duplicated when inputs are poly
2. **Semantic expanders** (chord, seq) - create voices from config, then normal duplication rules apply
3. **Stereo reducers** (spread, pan) - consume poly, output stereo pair

The `polyphonic` flag really means "I'm a stereo output device that shouldn't be duplicated".
