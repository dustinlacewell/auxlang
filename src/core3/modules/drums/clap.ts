import { defineModule } from "../../module/define";
import { sig, trigPort, unit } from "../../types";

/**
 * Hand clap: seeded noise through a band-pass, shaped by the classic four quick
 * bursts + decay tail. Hit-time constants live at module scope (never allocated
 * in tick); noise is seeded xorshift32.
 */
const HIT_TIMES = [0, 0.008, 0.018, 0.028];
const HIT_DURATION = 0.012;
const HIT_DECAY = 30;
const TAIL_START = 0.025;

export const clap = defineModule({
	name: "clap",
	ins: { trig: trigPort(), decay: sig(0.2), tone: unit(0.5) },
	outs: { out: sig() },
	defaultIn: "trig",
	defaultOut: "out",
	positional: ["decay", "tone"],
	config: { __seed: 1 },
	state: () => ({
		sampleCount: 0, active: 0, lpState: 0, hpState: 0, rng: 0, wasTrig: 0, started: 0,
	}),
	tick: (s, i, o, cfg, sr) => {
		if ((s.started as number) === 0) {
			const seed = (cfg.__seed as number) | 0;
			s.rng = seed === 0 ? 1 : seed >>> 0;
			s.started = 1;
		}
		if (i.trig > 0.5 && (s.wasTrig as number) <= 0.5) {
			s.sampleCount = 0;
			s.active = 1;
			s.lpState = 0;
			s.hpState = 0;
		}
		s.wasTrig = i.trig;

		const decay = Math.max(0.05, i.decay);
		const tone = Math.max(0, Math.min(1, i.tone));

		if ((s.active as number) === 0) {
			o.out = 0;
			return;
		}

		let x = s.rng as number;
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		x >>>= 0;
		s.rng = x;
		const noise = (x / 0xffffffff) * 2 - 1;

		const centerFreq = 1000 + tone * 1500;
		const lpFreq = centerFreq * 1.4;
		const hpFreq = centerFreq * 0.7;
		const lpCoef = Math.exp((-2 * Math.PI * lpFreq) / sr);
		const hpCoef = Math.exp((-2 * Math.PI * hpFreq) / sr);

		let lpState = s.lpState as number;
		lpState = lpState * lpCoef + noise * (1 - lpCoef);
		s.lpState = lpState;
		let hpState = s.hpState as number;
		const hpOut = lpState - hpState;
		hpState = hpState + (1 - hpCoef) * hpOut;
		s.hpState = hpState;
		const filtered = hpOut * 2;

		const sampleCount = s.sampleCount as number;
		const timeSec = sampleCount / sr;
		let env = 0;
		for (let h = 0; h < HIT_TIMES.length; h++) {
			const start = HIT_TIMES[h]!;
			const end = start + HIT_DURATION;
			if (timeSec >= start && timeSec < end) {
				const prog = (timeSec - start) / HIT_DURATION;
				env = Math.max(env, Math.exp(-prog * HIT_DECAY) * (0.7 + h * 0.1));
			}
		}
		if (timeSec >= TAIL_START) {
			const tailProg = (timeSec - TAIL_START) / decay;
			env = Math.max(env, Math.exp(-tailProg * 4) * 0.8);
		}

		if (timeSec > decay * 2 && env < 0.001) s.active = 0;
		s.sampleCount = sampleCount + 1;

		o.out = filtered * env;
	},
});
