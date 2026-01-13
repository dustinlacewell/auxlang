# Audio Model

Eurorack metaphor: everything is a signal.

## Signal Flow

```
clock → seq → cv/gate → osc → filter → env → effects → out
```

- **Clock**: Outputs `trig` (1-sample pulse) and `gate` (50% duty cycle)
- **Seq**: Receives clock, outputs `cv` (pitch Hz), `gate`, `trig` (onset pulse)
- **Downstream**: All continuous signal processing

## Key Insight vs Strudel

Strudel: `Pattern → Events → Fixed Synth`
Auxlang: `Clock → Seq → CV/Gate → [any devices]`

The sequencer is factored out as a module. This enables:
- Continuous modulation (LFOs on filter cutoff)
- Arbitrary signal routing
- Multiple clocks at different rates

## Signals

In core2, signals are plain numbers at runtime. Polyphony is handled at compile time via graph expansion - a poly seq becomes N mono seq nodes.

## Decisions

- D007: Eurorack metaphor
- D068: Mixdown uses sqrt(n) normalization
- core2: Compile-time poly expansion

## See Also

- [src/core2/devices/](../src/core2/devices/) - device implementations
- [src/core2/runtime/](../src/core2/runtime/) - worklet execution
