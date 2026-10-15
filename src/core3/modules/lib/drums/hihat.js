/**
 * Hi-hat: six inharmonically-detuned square waves (metallic) mixed with noise
 * (`Math.random()`, the lane's seeded stream), high-passed and enveloped. The
 * six partial frequencies (400 Hz × the classic 808 ratios) are precomputed
 * into state() once — tick does no allocation.
 */

/** Naive square from phase. */
function sq(p) {
	return p < 0.5 ? 1 : -1;
}

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
	state: () => ({
		p0: 0,
		p1: 0,
		p2: 0,
		p3: 0,
		p4: 0,
		p5: 0,
		f0: 400 * 1.0,
		f1: 400 * 1.4471,
		f2: 400 * 1.617,
		f3: 400 * 1.9265,
		f4: 400 * 2.5028,
		f5: 400 * 2.6637,
		amp: 0,
		hpState: 0,
		wasTrig: 0,
	}),
	helpers: { sq },
	tick: (s, i, o, _cfg, sr) => {
		if (i.trig > 0.5 && s.wasTrig <= 0.5) s.amp = 1;
		s.wasTrig = i.trig;
		const decay = Math.max(0.005, i.decay);
		const tone = Math.max(0, Math.min(1, i.tone));
		const metal = Math.max(0, Math.min(1, i.metal));
		const p0 = (s.p0 + s.f0 / sr) % 1;
		const p1 = (s.p1 + s.f1 / sr) % 1;
		const p2 = (s.p2 + s.f2 / sr) % 1;
		const p3 = (s.p3 + s.f3 / sr) % 1;
		const p4 = (s.p4 + s.f4 / sr) % 1;
		const p5 = (s.p5 + s.f5 / sr) % 1;
		s.p0 = p0;
		s.p1 = p1;
		s.p2 = p2;
		s.p3 = p3;
		s.p4 = p4;
		s.p5 = p5;
		const metallic = (sq(p0) + sq(p1) + sq(p2) + sq(p3) + sq(p4) + sq(p5)) / 6;
		const rawNoise = Math.random() * 2 - 1;
		const mixed = metallic * metal + rawNoise * (1 - metal);
		const hpCutoff = 4000 + tone * 8000;
		const hpCoef = 1 - Math.exp((-2 * Math.PI * hpCutoff) / sr);
		let hpState = s.hpState;
		hpState = hpState + hpCoef * (mixed - hpState);
		s.hpState = hpState;
		const filtered = mixed - hpState;
		let amp = s.amp;
		amp = Math.max(0, amp - amp * (1 / (decay * sr)) * 5);
		s.amp = amp;
		o.out = filtered * amp * 0.7;
	},
});
