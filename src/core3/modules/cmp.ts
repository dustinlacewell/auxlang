import { defmod } from "../patch/defmod";
import { sig } from "../types";

/** Comparators — each emits a 0/1 gate. gt/lt compare `in` against `than`, eq with tolerance. */

function createCmp(name: string, doc: string, fn: (a: number, b: number) => number): void {
	defmod({
		name,
		category: "utils",
		doc,
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

createCmp("gt", "Emits a gate when the input is greater than the threshold.", (a, b) =>
	a > b ? 1 : 0,
);
createCmp("lt", "Emits a gate when the input is less than the threshold.", (a, b) =>
	a < b ? 1 : 0,
);
createCmp("eq", "Emits a gate when the input equals the threshold.", (a, b) =>
	Math.abs(a - b) < 1e-4 ? 1 : 0,
);
