# Theory: Lazy Voice References

## The Insight

Why does `voices[0]` need the voice to exist? It doesn't.

```javascript
let c = chord(440, "maj")
c.voices[0].saw()
```

`voices[0]` could return a **proxy/ref** that says "voice 0 of this poly source".

The actual voice doesn't need to exist until expansion.

## How It Would Work

### VoiceRef Type

```typescript
interface VoiceRef {
  source: Descriptor;  // The poly descriptor
  index: number;       // Which voice
}
```

### Proxy Behavior

```javascript
let c = chord(440, "maj")  // Returns Descriptor with voiceCount hint
c.voices        // Returns VoiceAccessor proxy
c.voices[0]     // Returns VoiceRef { source: c, index: 0 }
c.voices[0].saw()  // Returns Descriptor with input = VoiceRef
```

### At Expansion Time

When processing a node with VoiceRef input:
1. Expand the source (chord → 3 chordTones)
2. Pick voice at index from expanded nodes
3. Wire connection

## What This Enables

### Voice access without eager expansion
```javascript
let c = chord(440, "maj")
c.voices[0].saw()   // Works - creates VoiceRef
c.voices[1].tri()   // Works - creates VoiceRef
c.voices[2].sqr()   // Works - creates VoiceRef
```

### Deferred expansion preserved
chord() doesn't expand until build time.
VoiceRef is just a symbolic pointer.

## Comparison to Eager Expansion

### Eager (previous theory)
```javascript
chord(440, "maj")  // Immediately creates [chordTone, chordTone, chordTone]
c.voices[0]        // Returns actual Descriptor
```

### Lazy (this theory)
```javascript
chord(440, "maj")  // Creates single Descriptor
c.voices[0]        // Returns VoiceRef { source: c, index: 0 }
```

## Advantages of Lazy

1. **Simpler API implementation** - chord() just returns one thing
2. **Less object creation** - voices created only during expansion
3. **Deferred model preserved** - expansion still happens at build time
4. **Voice access works** - via symbolic refs

## Implementation Sketch

### VoiceAccessor proxy
```typescript
function createVoiceAccessor(source: Descriptor): VoiceAccessor {
  return new Proxy({}, {
    get(_, prop) {
      const index = Number(prop);
      if (!Number.isNaN(index)) {
        return createVoiceRef(source, index);
      }
    }
  });
}
```

### VoiceRef is chainable
```typescript
function createVoiceRef(source: Descriptor, index: number): VoiceRef {
  const ref = { source, index };

  return new Proxy(ref, {
    get(target, prop) {
      // Chaining: ref.saw() creates new descriptor with VoiceRef as input
      const factory = getDeviceFactory(prop);
      if (factory) {
        return (...args) => {
          // Create descriptor with this VoiceRef as default input
          return createChainedDescriptor(target, prop, args);
        };
      }
      // Output access: ref.cv returns OutputRef to voice
      // ...
    }
  });
}
```

### During expansion
```typescript
function resolveInput(input: NodeInput, nodeMap: Map<NodeId, NodeId[]>): ... {
  if (isVoiceRef(input)) {
    // Expand the source first (if not already)
    const expandedIds = nodeMap.get(input.source.id);
    // Pick the voice at index
    const voiceId = expandedIds[input.index % expandedIds.length];
    return { ref: voiceId, out: defaultOutput };
  }
  // ... other cases
}
```

## Questions

### Q1: What about output access on VoiceRef?

```javascript
let s = seq("{c4,e4,g4}")
s.voices[0].cv   // VoiceRef to cv output of voice 0?
s.voices[0].gate // VoiceRef to gate output of voice 0?
```

Could work - VoiceRef tracks both source and output name.

### Q2: Out of range index?

```javascript
chord("maj").voices[5]  // Only 3 voices
```

Error at expansion time when we try to resolve and find index > actual voice count.

### Q3: Chaining after voice access?

```javascript
c.voices[0].saw().lpf(800)  // VoiceRef → Descriptor → Descriptor
```

Once you chain from VoiceRef, you get a regular mono Descriptor.
The VoiceRef is just the input binding.

## Conclusion

Lazy voice refs via proxy give us voice access WITHOUT eager expansion.

Best of both worlds:
- Deferred expansion (simpler implementation)
- Voice access (user capability)

No voiceCount metadata needed. Just `(source, index)`, resolved at expansion.
