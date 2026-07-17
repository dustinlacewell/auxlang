import { defineModule } from "../module/define";
import type { ModuleSpec } from "../types";
import { hz, semis, sig, unit } from "../types";

/**
 * Oscillator family (osc/sin/saw/tri/sqr).
 *
 * Frequency: `freq` wins when connected (non-null), else 440*2^((pitch-69)/12).
 * `phase` sets INITIAL phase only (seeded on first tick, not a running offset).
 * Output maps the [-1,1] waveform into [min,max].
 *
 * Band-limiting: saw and sqr use a 2-sample polyBLEP correction at each phase
 * discontinuity. tri is a leaky-integrated polyBLEP square (integrator scaled
 * by 4*freq/sr so amplitude stays ~unit; the leak removes DC drift). sin is
 * naive (no discontinuity to band-limit).
 */

type Shape = "sin" | "saw" | "tri" | "sqr";

/** 2-sample polyBLEP residual around a phase discontinuity at t=0/1. */
function polyBLEP(t: number, dt: number): number {
	if (t < dt) {
		const x = t / dt;
		return x + x - x * x - 1;
	}
	if (t > 1 - dt) {
		const x = (t - 1) / dt;
		return x * x + x + x + 1;
	}
	return 0;
}

function sample(shape: Shape, phase: number, dt: number, s: Record<string, unknown>): number {
	if (shape === "sin") return Math.sin(phase * Math.PI * 2);
	if (shape === "saw") return 2 * phase - 1 - polyBLEP(phase, dt);
	// square (shared by sqr and tri's integrand)
	let sq = phase < 0.5 ? 1 : -1;
	sq += polyBLEP(phase, dt);
	sq -= polyBLEP((phase + 0.5) % 1, dt);
	if (shape === "sqr") return sq;
	// tri: leaky integrator of the band-limited square
	let tri = (s.tri as number) + 4 * dt * sq;
	tri *= 0.999;
	s.tri = tri;
	return tri;
}

function createOsc(name: string, shape: Shape): ModuleSpec {
	return defineModule({
		name,
		ins: {
			pitch: semis(69),
			freq: hz(null),
			min: sig(-1),
			max: sig(1),
			phase: unit(0),
		},
		outs: { out: sig() },
		defaultIn: "pitch",
		defaultOut: "out",
		positional: ["freq", "min", "max"],
		config: { shape },
		state: () => ({ phase: 0, started: 0, tri: 0 }),
		tick: (s, i, o, cfg, sr) => {
			if ((s.started as number) === 0) {
				s.phase = ((i.phase % 1) + 1) % 1;
				s.started = 1;
			}
			const freq =
				i.freq !== null && Number.isFinite(i.freq)
					? i.freq
					: 440 * 2 ** ((i.pitch - 69) / 12);
			const dt = Math.min(0.5, Math.abs(freq) / sr);
			const phase = (s.phase as number);
			const raw = sample(cfg.shape as Shape, phase, dt, s);
			let next = phase + freq / sr;
			next -= Math.floor(next);
			s.phase = next;
			o.out = i.min + ((raw + 1) / 2) * (i.max - i.min);
		},
	});
}

export const osc = createOsc("osc", "sin");
export const sin = createOsc("sin", "sin");
export const saw = createOsc("saw", "saw");
export const tri = createOsc("tri", "tri");
export const sqr = createOsc("sqr", "sqr");
