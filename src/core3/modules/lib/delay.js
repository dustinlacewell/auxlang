/**
 * Feedback delay with a fractional (linearly interpolated) read head. The delay
 * line is a fixed `maxSecs`-second Float32Array allocated once in state();
 * `time` is clamped to it. `mix` crossfades dry/wet; `feedback` re-injects the
 * wet tap. `tone` darkens the repeats: a one-pole lowpass in the feedback
 * path, its cutoff 200 Hz at 0 rising exponentially toward 20 kHz. At 1 (the
 * default) the filter is out of the path, so each repeat is untouched.
 */
defmod({
	name: "delay",
	category: "effects",
	doc: "Feedback delay — echoes with a wet/dry mix.",
	ins: {
		in: sig(0),
		time: secs(0.25),
		feedback: unit(0.3),
		mix: unit(0.5),
		tone: unit(1),
	},
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["time", "feedback", "mix", "tone"],
	state: (sr) => {
		const maxSecs = 4;
		return { buf: new Float32Array(Math.ceil(maxSecs * sr)), w: 0, maxSecs, lp: 0 };
	},
	tick: (s, i, o, _cfg, sr) => {
		const buf = s.buf;
		const n = buf.length;
		const w = s.w;
		const feedback = Math.max(0, Math.min(0.99, i.feedback));
		const mix = Math.max(0, Math.min(1, i.mix));
		const time = Math.max(0, Math.min(s.maxSecs, i.time));
		const readPos = time * sr;
		const i0 = Math.floor(readPos);
		const frac = readPos - i0;
		let a = w - i0;
		let b = a - 1;
		a = ((a % n) + n) % n;
		b = ((b % n) + n) % n;
		const wet = (buf[a] ?? 0) * (1 - frac) + (buf[b] ?? 0) * frac;
		const tone = Math.max(0, Math.min(1, i.tone));
		let fed = wet;
		if (tone < 1) {
			const cutoff = 200 * 100 ** tone;
			s.lp = s.lp + (wet - s.lp) * (1 - Math.exp((-2 * Math.PI * cutoff) / sr));
			fed = s.lp;
		} else {
			s.lp = wet;
		}
		buf[w] = i.in + fed * feedback;
		s.w = (w + 1) % n;
		o.out = i.in * (1 - mix) + wet * mix;
	},
});
