# Narrowing Down Possibilities

Eliminating options based on research findings.

## Eliminated: Pure Signal Model

From `theories/signal-vs-structure.md`:

The signal model (width as data, SIMD-like) would require:
- All devices handle arrays in process()
- Can't route individual voices differently
- Major runtime changes

**Eliminated because:**
- Runtime constraint C1: AudioWorklet processes scalars
- Too invasive a change
- Loses ability to route voices differently

## Eliminated: No Builder At All

From `theories/node-creation-paths.md`:

Could eliminate builder if we walked backward from out().

**Eliminated because:**
- How to collect multiple out() nodes?
- Need somewhere to track them
- Some form of collection is necessary

BUT: Builder could be MUCH simpler (just out node list + backward walk).

## Still Viable: Eager Expansion

From `theories/eager-expansion.md`:

Expand poly at API time. `saw([220,330])` immediately creates PolyDescriptor.

**Status: Viable**
- Satisfies R1-R8
- Enables R9 (voice access)
- Challenge: input broadcasting (solved by mapping setters)
- Challenge: dynamic patterns (solvable by always parsing)

## Still Viable: Deferred Expansion (Fixed)

From `theories/deferred-expansion.md`:

Keep current model, fix bugs.

**Status: Viable IF R9 not required**
- Satisfies R1-R8
- Cannot satisfy R9 (voice access)
- Simpler implementation
- Proven model (with fixes)

## NEW: Lazy Voice Refs

From `theories/lazy-voice-refs.md`:

`voices[0]` doesn't need the voice to exist. It can return a **symbolic ref**.

```javascript
let c = chord(440, "maj")  // Single descriptor
c.voices[0]                // Returns VoiceRef { source: c, index: 0 }
c.voices[0].saw()          // Descriptor with VoiceRef as input
```

Expansion still happens at build time. VoiceRef is resolved then.

**This eliminates the either/or:**
- Deferred expansion ✓
- Voice access ✓ (via symbolic refs)
- No eager expansion complexity

## Semi-Eliminated: Complex expand() Contract

From `expand-poly.md` bug analysis:

expand() returning only some nodes (not internal chains) causes bugs.

**Options:**
1. expand() must return ALL nodes (including internal)
2. System walks returned nodes to find internal refs
3. Internal nodes register somehow

Option 2 seems cleanest - expand() contract stays simple, system does the work.

## Conclusion on Stereo Devices

From `theories/expand-semantics.md`:

spread/pan are "transforms" (N→2), not "unfolds" (config→N).

They're conceptually different from chord/seq.

**Recommendation:** Treat them separately.
- Unfold (chord, seq): Could be eager
- Transform (spread, pan): Must be at build time (needs voice count)

This is compatible with BOTH eager and deferred models:
- Eager: unfold at API, transform at build
- Deferred: both at build

## Remaining Decisions

1. **R9 Required?** - Need user input
2. **Mismatch behavior** - Max wins vs error vs upstream wins
3. **Passes** - One vs multiple (independent of above)

## Most Likely Architecture

### Path C: Deferred + Lazy Voice Refs (NEW FAVORITE)

- Current deferred model with bug fixes
- Add VoiceRef type for symbolic voice access
- `chord.voices[0]` returns VoiceRef, not actual node
- VoiceRef resolved during expansion

**Advantages:**
- Minimal change to existing system
- Voice access works
- No eager expansion complexity

**This subsumes Paths A and B.** We get voice access without eager expansion.
