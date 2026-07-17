import { sig } from "../types";
import { defineMap } from "./define-typed";

/** Divide input by `by` (0 → 0, avoiding Infinity/NaN in the graph). */
export const div = defineMap({
	name: "div",
	ins: { in: sig(0), by: sig(1) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["by"],
	tick: (_s, i, o) => {
		o.out = i.by === 0 ? 0 : i.in / i.by;
	},
});
