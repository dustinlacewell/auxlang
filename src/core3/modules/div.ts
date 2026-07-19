import { defmod } from "../patch/defmod";
import { sig } from "../types";

/** Divide input by `by` (0 → 0, avoiding Infinity/NaN in the graph). */
defmod({
	name: "div",
	category: "utils",
	doc: "Divides one signal by another.",
	ins: { in: sig(0), by: sig(1) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["by"],
	tick: (_s, i, o) => {
		o.out = i.by === 0 ? 0 : i.in / i.by;
	},
});
