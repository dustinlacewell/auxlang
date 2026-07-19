import { defmod } from "../patch/defmod";
import { hz, sig, unit } from "../types";

/**
 * Phaser: a cascade of first-order allpass stages whose break frequency is
 * swept by an internal LFO, summed with the dry signal. The moving notches this
 * creates are the classic phaser sweep. `stages` sets how many allpasses (more
 * = more notches, thicker), `rate` the LFO speed, `depth` how far the sweep
 * travels, `feedback` re-injects the last stage for resonance, `mix` dry/wet.
 *
 * Each allpass: y = -g·x + xPrev + g·yPrev, with g from the swept coefficient.
 * State holds each stage's one-sample x/y history in flat typed arrays (the
 * module contract wants plain serializable state — no arrays-of-typed-arrays).
 */
const MAX_STAGES = 8;

defmod({
	name: "phaser",
	category: "effects",
	doc: "Swept allpass phaser — moving notches over the dry signal.",
	ins: {
		in: sig(0),
		rate: hz(0.5),
		depth: unit(0.7),
		feedback: unit(0.3),
		mix: unit(0.5),
	},
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["rate", "depth", "mix"],
	config: { stages: 4 },
	state: () => ({
		phase: 0,
		last: 0,
		xh: new Float32Array(MAX_STAGES),
		yh: new Float32Array(MAX_STAGES),
	}),
	tick: (s, i, o, cfg, sr) => {
		const xh = s.xh as Float32Array;
		const yh = s.yh as Float32Array;
		const stages = Math.max(1, Math.min(MAX_STAGES, (cfg.stages as number) | 0));
		const depth = Math.max(0, Math.min(1, i.depth));
		const mix = Math.max(0, Math.min(1, i.mix));
		const feedback = Math.max(0, Math.min(0.97, i.feedback));

		// LFO in [0,1] → allpass coefficient sweeping a low..high range.
		const phase = ((s.phase as number) + i.rate / sr) % 1;
		const lfo = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
		const g = 0.4 + depth * 0.55 * lfo;

		let v = i.in + (s.last as number) * feedback;
		for (let k = 0; k < stages; k++) {
			const x = v;
			const y = -g * x + (xh[k] as number) + g * (yh[k] as number);
			xh[k] = x;
			yh[k] = y;
			v = y;
		}
		s.last = v;
		s.phase = phase;
		o.out = i.in * (1 - mix) + v * mix;
	},
});
