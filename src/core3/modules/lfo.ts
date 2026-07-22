import { defmod } from "../patch/defmod";
import { hz, sig, unit } from "../types";
import { type Shape, sample } from "./wave";

/**
 * Low-frequency oscillator: the Hz-rate modulation source.
 *
 * Where the osc family is pitch-first (semis positional), lfo is
 * frequency-first: `lfo(0.3, 100, 800)` sweeps 100→800 at 0.3 Hz. Shape is
 * config: `lfo({ shape: "tri" })` — sin (default), saw, tri, or sqr, sharing
 * the osc family's sampler (`wave.ts`). `phase` sets INITIAL phase only.
 * Output maps [-1,1] into [min,max].
 */
defmod({
	name: "lfo",
	category: "sources",
	doc: "LFO; frequency-first (Hz), shape via config (sin default).",
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
	config: { shape: "sin" },
	state: () => ({ phase: 0, started: 0 }),
	tick: (s, i, o, cfg, sr) => {
		if ((s.started as number) === 0) {
			s.phase = ((i.phase % 1) + 1) % 1;
			s.started = 1;
		}
		const dt = Math.min(0.5, Math.abs(i.freq) / sr);
		const phase = s.phase as number;
		const raw = sample(cfg.shape as Shape, phase, dt);
		let next = phase + i.freq / sr;
		next -= Math.floor(next);
		s.phase = next;
		o.out = i.min + ((raw + 1) / 2) * (i.max - i.min);
	},
});
