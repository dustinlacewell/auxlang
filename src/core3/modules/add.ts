import { sig } from "../types";
import { defineMap } from "./define-typed";

/** Add two signals. */
export const add = defineMap({
	name: "add",
	ins: { in: sig(0), to: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["to"],
	tick: (_s, i, o) => {
		o.out = i.in + i.to;
	},
});
