/**
 * Review probes:
 * 1. Does seq.cv.out() work, or does OutputRef.out field shadow the method?
 * 2. Do discarded intermediate nodes survive into the compiled graph?
 * 3. Does JSON.stringify / property introspection on a wrapped node throw?
 */
import { saw, sin } from "../../core2/api";
import { resetBuilder } from "../../core2/graph/graph-builder";
import { collect } from "../../core2/eval/collect";
import { expandPoly } from "../../core2/graph/expand-poly";

// --- Probe 1: .out on a ChainableOutputRef
resetBuilder();
try {
	const s = saw(440) as any;
	const ref = s.cv; // ChainableOutputRef
	console.log("probe1: typeof ref.out =", typeof ref.out, "value:", ref.out);
	ref.out();
	console.log("probe1: ref.out() succeeded");
} catch (e) {
	console.log("probe1: ref.out() THREW:", (e as Error).message);
}

// --- Probe 2: dead intermediates
resetBuilder();
const a = saw(440) as any;
a.freq(880).out(); // only the 880 one should sound
const flat = collect();
console.log("probe2: node count in flat graph:", flat.nodes.length, flat.nodes.map((n: any) => n.id));
const stereo = expandPoly(flat);
console.log("probe2: node count after expand:", stereo.nodes.length, stereo.nodes.map((n: any) => n.id));

// --- Probe 3: introspection hostility
resetBuilder();
const b = sin(2) as any;
try {
	JSON.stringify(b);
	console.log("probe3: JSON.stringify ok");
} catch (e) {
	console.log("probe3: JSON.stringify THREW:", (e as Error).message);
}
try {
	console.log("probe3: node.length =", b.length, "node.name =", b.name);
} catch (e) {
	console.log("probe3: length/name access THREW:", (e as Error).message);
}
