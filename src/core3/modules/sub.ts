import { defmod } from "../patch/defmod";
import { sig } from "../types";

/** Subtract: `sub(x).from(y)` → y - x. */
defmod({
	name: "sub",
	category: "utils",
	doc: "Subtracts one signal from another.",
	ins: { in: sig(0), from: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["from"],
	tick: (_s, i, o) => {
		o.out = i.from - i.in;
	},
});
