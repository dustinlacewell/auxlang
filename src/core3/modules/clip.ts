import { defmod } from "../patch/defmod";
import { sig } from "../types";

/** Clamp signal to [min, max]. */
defmod({
	name: "clip",
	category: "utils",
	doc: "Clamps a signal between a minimum and maximum.",
	ins: { in: sig(0), min: sig(-1), max: sig(1) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["min", "max"],
	tick: (_s, i, o) => {
		o.out = Math.max(i.min, Math.min(i.max, i.in));
	},
});
