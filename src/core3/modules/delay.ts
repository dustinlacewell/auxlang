import { defmod } from "../patch/defmod";
import { secs, sig, unit } from "../types";

/**
 * Feedback delay with a fractional (linearly interpolated) read head. The delay
 * line is a fixed 4-second Float32Array allocated once in state(); `time` is
 * clamped to it. `mix` crossfades dry/wet; `feedback` re-injects the wet tap.
 */
const MAX_SECS = 4;

defmod({
	name: "delay",
	category: "effects",
	doc: "Feedback delay — echoes with a wet/dry mix.",
	ins: {
		in: sig(0),
		time: secs(0.25),
		feedback: unit(0.3),
		mix: unit(0.5),
	},
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["time", "feedback", "mix"],
	state: (sr) => ({ buf: new Float32Array(Math.ceil(MAX_SECS * sr)), w: 0 }),
	tick: (s, i, o, _cfg, sr) => {
		const buf = s.buf as Float32Array;
		const n = buf.length;
		const w = s.w as number;
		const feedback = Math.max(0, Math.min(0.99, i.feedback));
		const mix = Math.max(0, Math.min(1, i.mix));
		const time = Math.max(0, Math.min(MAX_SECS, i.time));

		const readPos = time * sr;
		const i0 = Math.floor(readPos);
		const frac = readPos - i0;
		let a = w - i0;
		let b = a - 1;
		a = ((a % n) + n) % n;
		b = ((b % n) + n) % n;
		const wet = (buf[a] ?? 0) * (1 - frac) + (buf[b] ?? 0) * frac;

		buf[w] = i.in + wet * feedback;
		s.w = (w + 1) % n;
		o.out = i.in * (1 - mix) + wet * mix;
	},
});
