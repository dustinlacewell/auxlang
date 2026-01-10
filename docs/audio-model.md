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

All signals are `PolySignal = number[]`. Mono is 1-element array.

Polyphony emerges from seq outputting multiple voices. Downstream devices process all channels automatically.

## Decisions

- D007: Eurorack metaphor
- D034: All signals are PolySignal
- D068: Mixdown uses sqrt(n) normalization

## See Also

- [src/devices/](../src/devices/) - device implementations
- [src/runtime/](../src/runtime/) - worklet execution
