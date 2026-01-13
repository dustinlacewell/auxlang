# Voice Count Mismatch Behavior

## Empirical Results

### 2 voices, 3 cutoffs
```javascript
saw([220, 330]).lpf([800, 1200, 1600])
```
Result: **3 lpf nodes** created!
- lpf.0: cutoff = 800
- lpf.1: cutoff = 1200
- lpf.2: cutoff = 1600

The cutoff array **expanded the voice count**.

### 3 voices, 2 cutoffs
```javascript
saw([220, 330, 440]).lpf([800, 1200])
```
Result: **3 lpf nodes** (voice count stays at 3)
- lpf.0: cutoff = 800
- lpf.1: cutoff = 1200
- lpf.2: cutoff = 800 (wrapped)

### 4 voices, 2 cutoffs
```javascript
saw([220, 330, 440, 550]).lpf([800, 1200])
```
Result: **4 lpf nodes**
- lpf.0: cutoff = 800
- lpf.1: cutoff = 1200
- lpf.2: cutoff = 800 (wrapped)
- lpf.3: cutoff = 1200 (wrapped)

## The Rule

Voice count = **max of all poly sources**.

In case 1: max(2 saws, 3 cutoffs) = 3
- Saw voices wrap: saw.0, saw.1, saw.0 (saw[2%2]=saw[0])
- Wait, need to verify this...

## Verification

```javascript
saw([220, 330]).lpf([800, 1200, 1600])
```

What are the inputs to the 3 lpf nodes?

Need to check actual saw references, not just cutoff values.

## Implications

### Current Behavior
- Larger array wins
- Smaller arrays wrap with modulo
- Could lead to unexpected voice explosion

### Is This Right?

**Argument FOR:** Maximum expressiveness. Any array can drive voice count.

**Argument AGAINST:** Confusing. User expected 2 voices, got 3.

### Alternative: Error on mismatch

```javascript
saw([220, 330]).lpf([800, 1200, 1600])
// Error: voice count mismatch (2 vs 3)
```

User must explicitly match:
```javascript
saw([220, 330, 220]).lpf([800, 1200, 1600])  // Explicit 3 voices
```

### Alternative: First source wins

```javascript
saw([220, 330]).lpf([800, 1200, 1600])
// 2 voices, third cutoff ignored or error
```

## Decision Needed

Which behavior is correct?
1. Max wins (current) - permissive but confusing
2. Error on mismatch - strict, explicit
3. First/upstream wins - predictable, might lose data

## Verified: Upstream Wraps

```javascript
saw([220, 330]).lpf([800, 1200, 1600])
```

Actual structure:
```
saw1.0 (freq=220) ──┬──→ lpf2.0 (cutoff=800)
                   └──→ lpf2.2 (cutoff=1600)  ← REUSES saw1.0

saw1.1 (freq=330) ────→ lpf2.1 (cutoff=1200)
```

The saw nodes are NOT duplicated. Only 2 saws exist.
lpf2.2 references saw1.0 (wrap: `2 % 2 = 0`).

## This Means

- Voice count for a node = max of (upstream count, local array lengths)
- Upstream nodes are NOT re-expanded when downstream needs more voices
- Upstream references wrap with modulo

## Consequence

```javascript
saw([220, 330]).lpf([800, 1200, 1600]).out()
```

Produces:
- 2 distinct saw outputs
- 3 lpf nodes (but lpf2.0 and lpf2.2 share same saw input)
- 3 out nodes → 2 left, 1 right (round-robin)

Is this musically meaningful? Debatable.

Voice 2 is "220 Hz filtered at 1600 Hz" - a duplicate of voice 0 at different cutoff.

## Key Insight

The current system treats arrays as **per-node voice sources**.
Voice count can GROW downstream if a node has a longer array.
But upstream nodes don't retroactively expand - they wrap.

This is a coherent model, but potentially surprising.
