import { defmod } from "../patch/defmod";
import { sig } from "../types";

/** Add two signals. */
defmod({
	name: "add",
	category: "utils",
	doc: "Adds two signals.",
	ins: { in: sig(0), to: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["to"],
	tick: (_s, i, o) => {
		o.out = i.in + i.to;
	},
});
