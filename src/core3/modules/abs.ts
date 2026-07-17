import { sig } from "../types";
import { defineMap } from "./define-typed";

/** Absolute value. */
export const abs = defineMap({
	name: "abs",
	ins: { in: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	tick: (_s, i, o) => {
		o.out = Math.abs(i.in);
	},
});
