import { defineModule } from "../module/define";
import { sig, trigPort } from "../types";

/** Sample & hold — latches `in` when `trig` crosses 0.5, holds otherwise. */
export const sah = defineModule({
	name: "sah",
	ins: { in: sig(0), trig: trigPort() },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["trig"],
	state: () => ({ held: 0, started: 0 }),
	tick: (s, i, o) => {
		if ((s.started as number) === 0) {
			s.held = i.in;
			s.started = 1;
		}
		if (i.trig > 0.5) s.held = i.in;
		o.out = s.held as number;
	},
});
