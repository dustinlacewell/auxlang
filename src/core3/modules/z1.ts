import { defineModule } from "../module/define";
import { sig } from "../types";

/**
 * One-sample delay (z⁻¹). Emits the PREVIOUS sample's input; this is also the
 * back-edge target `loop()` cuts, so a feedback cycle arrives one sample late.
 */
export const z1 = defineModule({
	name: "z1",
	ins: { in: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	state: () => ({ prev: 0 }),
	tick: (s, i, o) => {
		o.out = s.prev as number;
		s.prev = i.in;
	},
});
