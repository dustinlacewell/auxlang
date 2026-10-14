import { defmod } from "../patch/defmod";
import { sig } from "../types";

/** Modulo — remainder of `in` by `by` (0 → 0). Named `wrap` so `.mod` means modulation. */
defmod({
	name: "wrap",
	category: "utils",
	doc: "Wraps a signal by modulo — the arithmetic remainder of in by `by`.",
	ins: { in: sig(0), by: sig(1) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["by"],
	tick: (_s, i, o) => {
		o.out = i.by === 0 ? 0 : i.in % i.by;
	},
});
