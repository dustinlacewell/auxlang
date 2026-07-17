import { defineModule } from "../module/define";
import type { ModuleSpec } from "../types";
import { sig } from "../types";

/** Comparators — each emits a 0/1 gate. gt/lt compare `in` against `than`, eq with tolerance. */

function createCmp(name: string, fn: (a: number, b: number) => number): ModuleSpec {
	return defineModule({
		name,
		ins: { in: sig(0), than: sig(0) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["than"],
		tick: (_s, i, o) => {
			o.out = fn(i.in, i.than);
		},
	});
}

export const gt = createCmp("gt", (a, b) => (a > b ? 1 : 0));
export const lt = createCmp("lt", (a, b) => (a < b ? 1 : 0));
export const eq = createCmp("eq", (a, b) => (Math.abs(a - b) < 1e-4 ? 1 : 0));
