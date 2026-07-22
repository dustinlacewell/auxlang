import { defmod } from "../patch/defmod";
import { hz, sig, unit } from "../types";

/**
 * Low-frequency oscillator: the Hz-rate modulation source.
 *
 * Where the osc family is pitch-first (semis positional), lfo is
 * frequency-first: `lfo(0.3, 100, 800)` sweeps 100→800 at 0.3 Hz. Sine
 * shape; naive generation is exact at LFO rates (no band-limiting needed).
 * `phase` sets INITIAL phase only. Output maps [-1,1] into [min,max].
 */
defmod({
	name: "lfo",
	category: "sources",
	doc: "Sine LFO; frequency-first (Hz).",
	ins: {
		freq: hz(1),
		min: sig(-1),
		max: sig(1),
		phase: unit(0),
	},
	outs: { out: sig() },
	defaultIn: "freq",
	defaultOut: "out",
	positional: ["freq", "min", "max"],
	state: () => ({ phase: 0, started: 0 }),
	tick: (s, i, o, _cfg, sr) => {
		if ((s.started as number) === 0) {
			s.phase = ((i.phase % 1) + 1) % 1;
			s.started = 1;
		}
		const phase = s.phase as number;
		const raw = Math.sin(phase * Math.PI * 2);
		let next = phase + i.freq / sr;
		next -= Math.floor(next);
		s.phase = next;
		o.out = i.min + ((raw + 1) / 2) * (i.max - i.min);
	},
});
