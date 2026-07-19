import { defmod } from "../patch/defmod";
import { sig } from "../types";

/** Absolute value. */
defmod({
	name: "abs",
	category: "utils",
	doc: "Absolute value — folds negatives to positive.",
	ins: { in: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	tick: (_s, i, o) => {
		o.out = Math.abs(i.in);
	},
});
