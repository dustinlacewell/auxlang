# Entity: NodeInput

Source: `src/core2/signal/node-input.ts`

## Definition

```typescript
type NodeInput = number | number[] | OutputRef | OutputRef[] | SignalLambda;
```

## The Five Input Types

| Type | Meaning | Poly? | Example |
|------|---------|-------|---------|
| `number` | Constant value | No | `440` |
| `number[]` | Multiple constant values | **Yes** | `[440, 550, 660]` |
| `OutputRef` | Connection to one output | No | `{ ref: "saw1", out: "cv" }` |
| `OutputRef[]` | Connections to multiple outputs | **Yes** | Array of refs |
| `SignalLambda` | Per-sample function | No | `(s, sr, t) => ...` |

## Observations

1. **Poly is encoded in input type** - Arrays represent polyphony
2. **Two sources of poly**:
   - `number[]` - user explicitly provides multiple values
   - `OutputRef[]` - upstream device expanded to multiple outputs
3. **Comment says**: "expanded in expandPoly pass" - poly isn't resolved at API time
4. **No metadata** - Input doesn't carry voice count, just IS the voices

## Questions Raised

- What is OutputRef exactly? (→ investigate output-ref.ts)
- What is SignalLambda? (→ investigate signal-lambda.ts)
- How does `number[]` become `OutputRef[]` during expansion?
- Can a single node have some inputs poly and others mono?

## Key Insight

**Poly is a property of the INPUT, not the node.**

A node can receive:
- Mono input (number or single OutputRef)
- Poly input (number[] or OutputRef[])

The NODE doesn't know if it's "poly" - it just has inputs, some of which may be arrays.

## Implications

This suggests two expansion strategies:
1. **Duplicate the node** - Create N copies, each with 1/N of the input
2. **Process internally** - Device handles array input itself

Current system seems to use #1 for most devices, #2 for "polyphonic" devices.
