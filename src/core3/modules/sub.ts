import { sig } from "../types";
import { defineMap } from "./define-typed";

/** Subtract: `sub(x).from(y)` → y - x. */
export const sub = defineMap({
	name: "sub",
	ins: { in: sig(0), from: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["from"],
	tick: (_s, i, o) => {
		o.out = i.from - i.in;
	},
});
