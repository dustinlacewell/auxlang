import { sig, unit } from "../types";
import { defineReduce } from "./define-typed";

/**
 * Master output. Reduces all lanes to a stereo pair: each lane i of n is placed
 * at constant-power position (i+0.5)/n → [-1,1] (n=1 → dead center), summed with
 * 1/√n scaling, then a one-pole DC blocker and a tanh soft-clip per channel.
 *
 * `gain` scales the pre-clip signal. Under reduce policy inputs arrive as lane
 * arrays; gain is read from lane 0 (it is a broadcast knob).
 */
const DC = 0.999;

export const out = defineReduce({
	name: "out",
	ins: { in: sig(0), gain: unit(0.8) },
	outs: { l: sig(), r: sig() },
	defaultIn: "in",
	defaultOut: "l",
	state: () => ({ dcxL: 0, dcyL: 0, dcxR: 0, dcyR: 0 }),
	tick: (s, ins, o, _cfg, _sr, width) => {
		const lanes = ins.in;
		const gains = ins.gain;
		const gain = typeof gains === "number" ? gains : (gains[0] ?? 0.8);
		const norm = 1 / Math.sqrt(Math.max(1, width));

		let sumL = 0;
		let sumR = 0;
		for (let l = 0; l < width; l++) {
			const v = typeof lanes === "number" ? lanes : (lanes[l] ?? 0);
			const pos = width === 1 ? 0 : ((l + 0.5) / width) * 2 - 1;
			const theta = ((pos + 1) / 2) * (Math.PI / 2);
			sumL += v * Math.cos(theta);
			sumR += v * Math.sin(theta);
		}
		sumL *= gain * norm;
		sumR *= gain * norm;

		// A non-finite bus sample (user NaN lambda, diverging feedback) must not
		// poison the master path: Inf/NaN entering the DC blocker turns into NaN
		// forever (Inf - Inf). Flush to silence and reset the blocker instead.
		if (!Number.isFinite(sumL) || !Number.isFinite(sumR)) {
			s.dcxL = 0;
			s.dcyL = 0;
			s.dcxR = 0;
			s.dcyR = 0;
			o.l = 0;
			o.r = 0;
			return;
		}

		// One-pole DC block per channel: y = x - x1 + DC*y1
		const yL = sumL - (s.dcxL as number) + DC * (s.dcyL as number);
		s.dcxL = sumL;
		s.dcyL = yL;
		const yR = sumR - (s.dcxR as number) + DC * (s.dcyR as number);
		s.dcxR = sumR;
		s.dcyR = yR;

		o.l = Math.tanh(yL);
		o.r = Math.tanh(yR);
	},
});
