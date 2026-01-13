# Investigation Queue

Files and concepts to investigate, in priority order.

## Completed

- [x] `src/core2/graph/node.ts` - Plain data, no poly concept → entities/node.md
- [x] `src/core2/graph/output-ref.ts` - Symbolic pointer → entities/output-ref.md
- [x] `src/core2/signal/node-input.ts` - Poly via arrays → entities/node-input.md
- [x] `src/core2/device/device-spec.ts` - Schema + runtime + expand → entities/device-spec.md
- [x] `src/core2/graph/graph-builder.ts` - Dumb bag → entities/graph-builder.md
- [x] `src/core2/graph/expand-poly.ts` - The heart of expansion → systems/expand-poly.md
- [x] `src/core2/wrap/wrap.ts` - Fluent API layer → systems/wrap.md
- [x] `src/core2/devices/osc.ts` - Simple passthrough → device-taxonomy.md
- [x] `src/core2/devices/mix.ts` - Aggregator → device-taxonomy.md

## High Priority - Node Creation Details

- [ ] `src/core2/graph/create-node.ts` - How IDs assigned, what's created
- [ ] `src/core2/device/create-device-node.ts` - Registration logic
- [ ] `src/core2/device/device.ts` - Factory patterns, anon vs named

## High Priority - Compilation

- [ ] `src/core2/runtime/compile.ts` - What happens after expansion?
- [ ] Runtime node structure vs graph node

## Medium Priority - Supporting Types

- [ ] `src/core2/signal/signal-lambda.ts` - Per-sample functions
- [ ] `src/core2/signal/config-value.ts` - Static config type
- [ ] `src/core2/device/input-def.ts` - Input schema
- [ ] `src/core2/device/process-fn.ts` - Process signature

## Medium Priority - API Surface

- [ ] `src/core2/api.ts` - What's exposed to users?
- [ ] `src/core2/eval/run-code.ts` - How user code executes
- [ ] `src/core2/eval/collect.ts` - How graph is collected

## Lower Priority - Specific Devices

- [ ] `src/core2/devices/seq/seq.ts` - Complex semantic expansion
- [ ] `src/core2/devices/chord.ts` - Already understood, verify details
- [ ] `src/core2/devices/spread.ts` - Already understood, verify details
- [ ] `src/core2/devices/pan.ts` - Similar to spread
- [ ] `src/core2/devices/out.ts` - Terminal device

## Leads Found During Research

- [ ] wrap.ts line 105: callable `node(440)` uses createNode not createDeviceNode
- [ ] What determines if a device SHOULD be duplicated vs shouldn't?
- [ ] Are there devices that REDUCE poly? (N → 1)
- [ ] How does stereo distribution interact with spread's L/R creation?
- [ ] What happens if expand() creates nodes that reference each other?
- [ ] The registry stores anonymous device specs - why?
