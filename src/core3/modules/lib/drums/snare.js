/**
 * Snare: two detuned sine bodies plus band-passed noise for the wires. Noise
 * is `Math.random()`, the lane's seeded stream. Retriggered on `trig`.
 */
defmod({
	name: "snare",
	category: "drums",
	doc: "Snare drum.",
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
	state: () => ({
		phase1: 0,
		phase2: 0,
		bodyAmp: 0,
		noiseAmp: 0,
		lpState: 0,
		hpState: 0,
		wasTrig: 0,
	}),
	tick: (s, i, o, _cfg, sr) => {
		if (i.trig > 0.5 && s.wasTrig <= 0.5) {
			s.bodyAmp = 1;
			s.noiseAmp = 1;
		}
		s.wasTrig = i.trig;
		const tone = Math.max(0, Math.min(1, i.tone));
		const decay = Math.max(0.01, i.decay);
		const snappy = Math.max(0, Math.min(1, i.snappy));
		const phase1 = (s.phase1 + i.pitch / sr) % 1;
		const phase2 = (s.phase2 + (i.pitch * 1.5) / sr) % 1;
		s.phase1 = phase1;
		s.phase2 = phase2;
		const body = Math.sin(phase1 * Math.PI * 2) * 0.7 + Math.sin(phase2 * Math.PI * 2) * 0.3;
		let bodyAmp = s.bodyAmp;
		bodyAmp = Math.max(0, bodyAmp - bodyAmp * (1 / (decay * 0.5 * sr)) * 5);
		s.bodyAmp = bodyAmp;
		const rawNoise = Math.random() * 2 - 1;
		const hpCutoff = 2000 + snappy * 4000;
		const lpCutoff = 5000 + snappy * 7000;
		const hpCoef = 1 - Math.exp((-2 * Math.PI * hpCutoff) / sr);
		const lpCoef = 1 - Math.exp((-2 * Math.PI * lpCutoff) / sr);
		let hpState = s.hpState;
		hpState = hpState + hpCoef * (rawNoise - hpState);
		s.hpState = hpState;
		const hpOut = rawNoise - hpState;
		let lpState = s.lpState;
		lpState = lpState + lpCoef * (hpOut - lpState);
		s.lpState = lpState;
		let noiseAmp = s.noiseAmp;
		noiseAmp = Math.max(0, noiseAmp - noiseAmp * (1 / (decay * sr)) * 4);
		s.noiseAmp = noiseAmp;
		o.out = body * bodyAmp * tone + lpState * noiseAmp * (1 - tone) * 1.5;
	},
});
