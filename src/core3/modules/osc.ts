import { defmod } from "../patch/defmod";
import { hz, optional, semis, sig, unit } from "../types";
import { type Shape, sample } from "./wave";

/**
 * Oscillator family (sin/saw/tri/sqr).
 *
 * Pitch-first: positional signature is [pitch, min, max] (MIDI semis), so
 * `sin(69)`, `sin(p\`a4\`)`, and `seq(...).sin()` all mean A440. `freq` (Hz) is
 * object-config only and wins when connected (non-null), else
 * 440*2^((pitch-69)/12). For Hz-rate modulators use the `lfo` module.
 * `phase` sets INITIAL phase only (seeded on first tick, not a running offset).
 * Output maps the [-1,1] waveform into [min,max].
 *
 * Waveform generation and band-limiting live in `wave.ts` (shared with lfo).
 */

function createOsc(name: string, shape: Shape, doc: string): void {
	defmod({
		name,
		category: "sources",
		doc,
		ins: {
			pitch: semis(69),
			freq: optional(hz(null)),
			min: sig(-1),
			max: sig(1),
			phase: unit(0),
		},
		outs: { out: sig() },
		defaultIn: "pitch",
		defaultOut: "out",
		positional: ["pitch", "min", "max"],
		config: { shape },
		state: () => ({ phase: 0, started: 0 }),
		tick: (s, i, o, cfg, sr) => {
			if ((s.started as number) === 0) {
				s.phase = ((i.phase % 1) + 1) % 1;
				s.started = 1;
			}
			const freq =
				i.freq !== null && Number.isFinite(i.freq) ? i.freq : 440 * 2 ** ((i.pitch - 69) / 12);
			const dt = Math.min(0.5, Math.abs(freq) / sr);
			const phase = s.phase as number;
			const raw = sample(cfg.shape as Shape, phase, dt);
			let next = phase + freq / sr;
			next -= Math.floor(next);
			s.phase = next;
			o.out = i.min + ((raw + 1) / 2) * (i.max - i.min);
		},
	});
}

createOsc("sin", "sin", "Sine oscillator.");
createOsc("saw", "saw", "Sawtooth oscillator, band-limited.");
createOsc("tri", "tri", "Triangle oscillator.");
createOsc("sqr", "sqr", "Square oscillator, band-limited.");
