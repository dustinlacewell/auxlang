import { defmod } from "../patch/defmod";
import { sig } from "../types";

/** Multiply two signals. `vca` and `gain` are the amplitude-named aliases. */
function createMul(name: string, doc: string): void {
	defmod({
		name,
		category: "utils",
		doc,
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

createMul("mul", "Multiplies two signals — amplitude control and VCAs.");
createMul("vca", "Multiplies two signals — amplitude control and VCAs.");
createMul("gain", "Multiplies two signals — amplitude control and VCAs.");
