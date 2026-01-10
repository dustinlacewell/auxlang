# Live Re-evaluation

Code changes take effect immediately during playback.

## How It Works

1. **Topology matching**: Nodes identified by device type + connections (not config)
2. **State transfer**: Matched nodes preserve state (clock phase, seq position, osc phase)
3. **Seq beat sync**: Pattern changes queue until next beat
4. **100ms crossfade**: Old graph fades out, new graph fades in

## Topology Hash

```
hash = deviceType + sorted(inputConnections)
```

Config excluded so `clock(120)` matches `clock(180)`.

## AudioContext Reuse

Same worklet instance across re-evals. Essential for state preservation.

## Decisions

- D036: Topology matching for state preservation
- D037: Runtime swaps immediately; seq queues pattern changes
- D038: 100ms linear crossfade
- D039: AudioContext reused

## See Also

- [src/graph/diff/](../src/graph/diff/) - topology hashing and diffing
- [live-reeval.html](../live-reeval.html) - interactive test page
