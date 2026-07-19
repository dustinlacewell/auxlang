import { defmod } from "../patch/defmod";
import { sig } from "../types";

/** Map `in` from [from, to] onto [min, max] linearly (default: bipolar → unipolar). */
defmod({
	name: "scale",
	category: "utils",
	doc: "Remaps a signal from one range onto another.",
	ins: { in: sig(0), from: sig(-1), to: sig(1), min: sig(0), max: sig(1) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["min", "max", "from", "to"],
	tick: (_s, i, o) => {
		const span = i.to - i.from;
		const norm = span === 0 ? 0 : (i.in - i.from) / span;
		o.out = i.min + norm * (i.max - i.min);
	},
});
