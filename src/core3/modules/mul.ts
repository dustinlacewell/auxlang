import { defineModule } from "../module/define";
import type { ModuleSpec } from "../types";
import { sig } from "../types";

/** Multiply two signals. `vca` and `gain` are the amplitude-named aliases. */
function createMul(name: string): ModuleSpec {
	return defineModule({
		name,
		ins: { in: sig(0), by: sig(1) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["by"],
		tick: (_s, i, o) => {
			o.out = i.in * i.by;
		},
	});
}

export const mul = createMul("mul");
export const vca = createMul("vca");
export const gain = createMul("gain");
