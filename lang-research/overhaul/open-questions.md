# Open Questions

Questions that need answers. Updated as research progresses.

## Foundational

- [ ] What is a "voice"? Is it a lane of computation, a separate node, or metadata?
- [ ] What is the relationship between "poly" and "stereo"?
- [ ] When does the user need to know about voice count?
- [ ] When does the system need to know about voice count?

## Graph Model

- [x] What is a node conceptually? → **Static description of computation** (see entities/node.md)
- [ ] Should the API graph and runtime graph be the same structure?
- [ ] What is the role of the builder? Accumulator? Collector? Both?
- [ ] Why does Node have no output information? Outputs are in DeviceSpec only.

## Expansion

- [ ] Is expansion a transformation of nodes or creation of new nodes?
- [ ] Should expanded nodes replace original or coexist?
- [ ] What triggers expansion? Input type? Device type? Explicit request?
- [ ] What is the relationship between `polyphonic` flag and `expand` hook?
- [ ] Why does `expand` return WrappedNode instead of plain Node?

## Information Flow

- [ ] What information flows from user code to runtime?
- [ ] What information is lost between phases?
- [ ] What information must be preserved vs can be derived?

## Poly Representation (NEW from research)

- [x] Where is poly encoded? → **In input type** (number[] or OutputRef[])
- [ ] Can a node have mixed mono/poly inputs?
- [ ] How does poly "propagate" through the graph?
- [ ] What determines voice count when multiple poly inputs disagree?

## Device Types (NEW from research)

- [ ] What's the full taxonomy of device poly behaviors?
- [ ] Can a device be both `polyphonic: true` AND have `expand`?
- [ ] What devices need semantic expansion (domain knowledge)?
- [ ] What devices need topology transformation (N→M)?
