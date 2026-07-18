import { hz, sig, trigPort, unit } from "../../types";
import { defineMap } from "../define-typed";

/**
 * Snare: two detuned sine bodies plus band-passed noise for the wires. Noise is
 * a seeded xorshift32 (no Math.random — determinism law). Retriggered on `trig`.
 */
export const snare = defineMap({
	name: "snare",
	ins: {
		trig: trigPort(),
		pitch: hz(180),
		tone: unit(0.4),
		decay: sig(0.15),
		snappy: unit(0.7),
	},
	outs: { out: sig() },
	defaultIn: "trig",
	defaultOut: "out",
	positional: ["pitch", "tone", "decay", "snappy"],
	config: { __seed: 1 },
	state: () => ({
		phase1: 0,
		phase2: 0,
		bodyAmp: 0,
		noiseAmp: 0,
		lpState: 0,
		hpState: 0,
		rng: 0,
		wasTrig: 0,
		started: 0,
	}),
	tick: (s, i, o, cfg, sr) => {
		if ((s.started as number) === 0) {
			const seed = (cfg.__seed as number) | 0;
			s.rng = seed === 0 ? 1 : seed >>> 0;
			s.started = 1;
		}
		if (i.trig > 0.5 && (s.wasTrig as number) <= 0.5) {
			s.bodyAmp = 1;
			s.noiseAmp = 1;
		}
		s.wasTrig = i.trig;

		const tone = Math.max(0, Math.min(1, i.tone));
		const decay = Math.max(0.01, i.decay);
		const snappy = Math.max(0, Math.min(1, i.snappy));

		const phase1 = ((s.phase1 as number) + i.pitch / sr) % 1;
		const phase2 = ((s.phase2 as number) + (i.pitch * 1.5) / sr) % 1;
		s.phase1 = phase1;
		s.phase2 = phase2;
		const body = Math.sin(phase1 * Math.PI * 2) * 0.7 + Math.sin(phase2 * Math.PI * 2) * 0.3;

		let bodyAmp = s.bodyAmp as number;
		bodyAmp = Math.max(0, bodyAmp - bodyAmp * (1 / (decay * 0.5 * sr)) * 5);
		s.bodyAmp = bodyAmp;

		let x = s.rng as number;
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		x >>>= 0;
		s.rng = x;
		const rawNoise = (x / 0xffffffff) * 2 - 1;

		const hpCutoff = 2000 + snappy * 4000;
		const lpCutoff = 5000 + snappy * 7000;
		const hpCoef = 1 - Math.exp((-2 * Math.PI * hpCutoff) / sr);
		const lpCoef = 1 - Math.exp((-2 * Math.PI * lpCutoff) / sr);

		let hpState = s.hpState as number;
		hpState = hpState + hpCoef * (rawNoise - hpState);
		s.hpState = hpState;
		const hpOut = rawNoise - hpState;
		let lpState = s.lpState as number;
		lpState = lpState + lpCoef * (hpOut - lpState);
		s.lpState = lpState;

		let noiseAmp = s.noiseAmp as number;
		noiseAmp = Math.max(0, noiseAmp - noiseAmp * (1 / (decay * sr)) * 4);
		s.noiseAmp = noiseAmp;

		o.out = body * bodyAmp * tone + lpState * noiseAmp * (1 - tone) * 1.5;
	},
});
