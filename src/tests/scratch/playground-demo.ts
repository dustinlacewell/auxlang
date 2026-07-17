/**
 * Headless proof that the playground's demo patch compiles and renders
 * non-silent audio through the SAME eval path the page uses. Run:
 *   npx tsx src/tests/scratch/playground-demo.ts
 */

import { render } from "@/core3/runtime/render";
import { DEMO_PATCH } from "@/ui/core3-playground/demo";
import { evalPatch } from "@/ui/core3-playground/eval-patch";

const program = evalPatch(DEMO_PATCH);
const { l, r } = render(program, 2);

function rms(buf: Float32Array): number {
	let sum = 0;
	for (let i = 0; i < buf.length; i++) sum += (buf[i] as number) ** 2;
	return Math.sqrt(sum / buf.length);
}

const rmsL = rms(l);
const rmsR = rms(r);
console.log(`samples: ${l.length}  RMS L: ${rmsL.toFixed(6)}  RMS R: ${rmsR.toFixed(6)}`);
if (rmsL < 1e-5 && rmsR < 1e-5) {
	console.error("SILENT — demo produced no signal");
	process.exit(1);
}
console.log("OK: non-silent");
