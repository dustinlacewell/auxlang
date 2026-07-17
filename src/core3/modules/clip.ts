import { defineModule } from "../module/define";
import { sig } from "../types";

/** Clamp signal to [min, max]. */
export const clip = defineModule({
	name: "clip",
	ins: { in: sig(0), min: sig(-1), max: sig(1) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["min", "max"],
	tick: (_s, i, o) => {
		o.out = Math.max(i.min, Math.min(i.max, i.in));
	},
});
