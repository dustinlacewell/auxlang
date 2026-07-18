import { sig } from "../types";
import { defineMap } from "./define-typed";

/** Clamp signal to [min, max]. */
export const clip = defineMap({
	name: "clip",
	ins: { in: sig(0), min: sig(-1), max: sig(1) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["min", "max"],
	tick: (_s, i, o) => {
		o.out = Math.max(i.min, Math.min(i.max, i.in));
	},
});
