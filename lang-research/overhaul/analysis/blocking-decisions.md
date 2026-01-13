# Blocking Decisions

Decisions that must be made before architecture can be finalized.

## Decision 1: Is voice access required?

```javascript
let c = chord(440, "maj")
c.voices[0].saw()  // Access individual voice
c.voices[1].tri()
```

### If YES → Eager expansion required
- Poly must expand at API time
- Voices exist as separate descriptors
- Can access and process individually

### If NO → Deferred expansion acceptable
- Current model (with fixes) works
- Simpler implementation
- No voice access, but alternatives exist

### Current Status: UNKNOWN

Need user input. What's the actual use case?

---

## Decision 2: Are spread/pan "expansion" or "termination"?

### Option A: They're expanders
- Part of the general expand() mechanism
- Can create arbitrary node structures
- Need graph walking to collect all nodes

### Option B: They're terminators
- Special stereo endpoints
- Always N→2, always at end of chain
- Could be handled differently from other expansion

### Implication

If terminators, they don't need expand() at all. They could be:
- Built-in to out()
- Separate stereo routing mechanism
- Not devices at all

### Current Status: LEANS TOWARD B

spread and pan are only devices with `polyphonic: true`.
They always output stereo.
They're conceptually different from chord/seq expansion.

---

## Decision 3: What happens with voice count mismatch?

```javascript
saw([220, 330]).lpf([800, 1200, 1600])  // 2 vs 3
```

### Option A: Error
Mismatched counts are a bug. Fail loudly.

### Option B: Modulo wrap (current)
3rd cutoff wraps: `voices[2 % 2] = voices[0]` gets 1600.
Wait, that gives voice 0 two cutoffs. Actually current behavior:
- voice 0 gets cutoff[0] = 800
- voice 1 gets cutoff[1] = 1200
- cutoff[2] = 1600 is unused? Or does it expand to 3 voices?

### Need to test current behavior

### Current Status: UNKNOWN

---

## Decision 4: Should NodeInput allow arrays?

### Option A: Yes (current)
- `{ freq: [220, 330] }` is valid input
- Arrays mean poly
- Expanded during expansion pass

### Option B: No arrays at API
- Poly is PolyDescriptor, not array in input
- `saw([220, 330])` returns PolyDescriptor, not single node with array
- Cleaner separation

### Implication

Option B requires eager expansion (Decision 1 = YES).

If we want deferred expansion, arrays in inputs are necessary.

### Current Status: DEPENDS ON DECISION 1

---

## Decision 5: One pass or multiple passes?

### Option A: One pass (current expandPoly)
- Topo sort + duplication + expansion + stereo distribution
- 328 lines, complex

### Option B: Multiple passes
```
Pass 1: Semantic expansion (chord → chordTones)
Pass 2: Voice duplication (mono → poly)
Pass 3: Stereo distribution (poly → L/R)
```

### Implication

Multiple passes is cleaner but:
- More intermediate representations
- Potentially slower
- Need to define intermediate graph types

### Current Status: LEANS TOWARD B

Separation of concerns suggests multiple passes.
Performance likely not an issue (happens once at build time).

---

## Dependency Graph

```
Decision 1 (voice access?)
    │
    ├── YES → Eager expansion
    │         └── Decision 4 = No arrays in input
    │
    └── NO → Deferred expansion OK
              └── Decision 4 = Arrays in input

Decision 2 (spread/pan role?)
    │
    ├── Expanders → Part of expand mechanism
    │
    └── Terminators → Separate stereo mechanism

Decision 5 (passes?)
    │
    └── Independent of above, but affects implementation
```

## Most Blocking

**Decision 1** is most blocking. It determines:
- Eager vs deferred expansion
- Whether arrays live in NodeInput
- Mental model for users

Recommend: Get user input on voice access requirement.
