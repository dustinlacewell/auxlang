/**
 * Verify every doc snippet renders through the real eval path. Run with
 *   npx tsx src/tests/scratch/docs-snippets.ts
 * Prints PASS/FAIL per snippet (RMS + finiteness) and exits non-zero on any
 * failure, so it can be iterated until the docs are all green.
 */

import "@/core3/modules/all";
import { render } from "@/core3/runtime/render";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { SNIPPETS } from "../../../docs/snippets";

function rms(buf: Float32Array): number {
	let s = 0;
	for (const x of buf) s += x * x;
	return Math.sqrt(s / Math.max(1, buf.length));
}

function finite(buf: Float32Array): boolean {
	for (const x of buf) if (!Number.isFinite(x)) return false;
	return true;
}

let failed = 0;
for (const snip of SNIPPETS) {
	try {
		const { l, r } = render(evalPatch(snip.code), 2);
		const ok = finite(l) && finite(r);
		const level = rms(l);
		const audibleOk = !snip.audible || level > 0.005;
		if (ok && audibleOk) {
			console.log(`PASS ${snip.id}  rms=${level.toFixed(4)}`);
		} else {
			failed++;
			console.log(
				`FAIL ${snip.id}  finite=${ok} rms=${level.toFixed(4)} (audible=${snip.audible})`,
			);
		}
	} catch (err) {
		failed++;
		console.log(`FAIL ${snip.id}  ERROR ${(err as Error).message}`);
	}
}

console.log(`\n${SNIPPETS.length - failed}/${SNIPPETS.length} snippets green`);
process.exit(failed > 0 ? 1 : 0);
