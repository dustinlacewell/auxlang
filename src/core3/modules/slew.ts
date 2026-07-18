import { secs, sig } from "../types";
import { defineMap } from "./define-typed";

/**
 * Slew limiter / lag. `rise`/`fall` are the seconds to traverse one full unit;
 * the per-sample step is 1/(time*sr), so it is unit-linear (correct portamento
 * on semitone pitch: gliding an octave takes the same time regardless of range).
 */
export const slew = defineMap({
	name: "slew",
	ins: { in: sig(0), rise: secs(0.1), fall: secs(0.1) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["rise", "fall"],
	state: () => ({ current: 0, started: 0 }),
	tick: (s, i, o, _cfg, sr) => {
		if ((s.started as number) === 0) {
			s.current = i.in;
			s.started = 1;
		}
		const current = s.current as number;
		let next: number;
		if (i.in > current) {
			next = i.rise <= 0 ? i.in : Math.min(i.in, current + 1 / (i.rise * sr));
		} else {
			next = i.fall <= 0 ? i.in : Math.max(i.in, current - 1 / (i.fall * sr));
		}
		s.current = next;
		o.out = next;
	},
});
