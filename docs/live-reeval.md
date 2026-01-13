# Live Re-evaluation

Code changes take effect immediately during playback.

## How It Works

1. **Topology matching**: Nodes identified by device type + connections (not config)
2. **State transfer**: Matched nodes preserve state via deep clone
3. **WASM state**: Serialized/deserialized between instances
4. **3s crossfade**: Old and new graphs run in parallel, linear crossfade

## Topology Hash

```
hash = deviceType + sorted(inputConnections)
```

Config excluded so `clock(120)` matches `clock(180)`.

## State Preservation

State is preserved via:
1. `collectStates()` - gathers all node states from old graph
2. `deepCloneState()` - TypedArray-aware deep clone
3. `restoreState()` - applies cloned state to matched nodes in new graph

Both graphs run in parallel during crossfade. Each has independent state copies.

## WASM State

WASM devices export `serialize()`/`deserialize()` for state transfer:
- Old instance state serialized before swap
- New instance initialized, then state deserialized
- Enables filter resonance, reverb tails, delay buffers to survive

## AudioContext Reuse

Same worklet instance across re-evals. Essential for state preservation.

## Decisions

- D036: Topology matching for state preservation
- D037: Runtime swaps immediately
- D038: 3s linear crossfade
- D039: AudioContext reused
- D080/D082: WASM state serialization

## See Also

- [src/core2/runtime/topology-hash.ts](../src/core2/runtime/topology-hash.ts) - node matching
- [src/core2/runtime/worklet/graph/swap-graph.ts](../src/core2/runtime/worklet/graph/swap-graph.ts) - graph swap
- [src/core2/runtime/worklet/graph/deep-clone-state.ts](../src/core2/runtime/worklet/graph/deep-clone-state.ts) - state cloning
