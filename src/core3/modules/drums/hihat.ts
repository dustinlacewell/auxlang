import { defmod } from "../../patch/defmod";
import { sig, trigPort, unit } from "../../types";

/**
 * Hi-hat: six inharmonically-detuned square waves (metallic) mixed with seeded
 * noise, high-passed and enveloped. The six partial frequencies are precomputed
 * into state() once — tick does no allocation and no `.map()`.
 */
const RATIOS = [1.0, 1.4471, 1.617, 1.9265, 2.5028, 2.6637];
const BASE = 400;

/** Naive square from phase — hoisted so tick allocates no closure. */
const sq = (p: number): number => (p < 0.5 ? 1 : -1);

defmod({
	name: "hihat",
	category: "drums",
	doc: "Hi-hat.",
	ins: {
		trig: trigPort(),
		decay: sig(0.05),
		tone: unit(0.6),
		metal: unit(0.5),
	},
	outs: { out: sig() },
	defaultIn: "trig",
	defaultOut: "out",
	positional: ["decay", "tone", "metal"],
	config: { __seed: 1 },
	state: () => ({
		p0: 0,
		p1: 0,
		p2: 0,
		p3: 0,
		p4: 0,
		p5: 0,
		f0: BASE * RATIOS[0]!,
		f1: BASE * RATIOS[1]!,
		f2: BASE * RATIOS[2]!,
		f3: BASE * RATIOS[3]!,
		f4: BASE * RATIOS[4]!,
		f5: BASE * RATIOS[5]!,
		amp: 0,
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
		if (i.trig > 0.5 && (s.wasTrig as number) <= 0.5) s.amp = 1;
		s.wasTrig = i.trig;

		const decay = Math.max(0.005, i.decay);
		const tone = Math.max(0, Math.min(1, i.tone));
		const metal = Math.max(0, Math.min(1, i.metal));

		const p0 = ((s.p0 as number) + (s.f0 as number) / sr) % 1;
		const p1 = ((s.p1 as number) + (s.f1 as number) / sr) % 1;
		const p2 = ((s.p2 as number) + (s.f2 as number) / sr) % 1;
		const p3 = ((s.p3 as number) + (s.f3 as number) / sr) % 1;
		const p4 = ((s.p4 as number) + (s.f4 as number) / sr) % 1;
		const p5 = ((s.p5 as number) + (s.f5 as number) / sr) % 1;
		s.p0 = p0;
		s.p1 = p1;
		s.p2 = p2;
		s.p3 = p3;
		s.p4 = p4;
		s.p5 = p5;

		const metallic = (sq(p0) + sq(p1) + sq(p2) + sq(p3) + sq(p4) + sq(p5)) / 6;

		let x = s.rng as number;
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		x >>>= 0;
		s.rng = x;
		const rawNoise = (x / 0xffffffff) * 2 - 1;

		const mixed = metallic * metal + rawNoise * (1 - metal);

		const hpCutoff = 4000 + tone * 8000;
		const hpCoef = 1 - Math.exp((-2 * Math.PI * hpCutoff) / sr);
		let hpState = s.hpState as number;
		hpState = hpState + hpCoef * (mixed - hpState);
		s.hpState = hpState;
		const filtered = mixed - hpState;

		let amp = s.amp as number;
		amp = Math.max(0, amp - amp * (1 / (decay * sr)) * 5);
		s.amp = amp;

		o.out = filtered * amp * 0.7;
	},
});
