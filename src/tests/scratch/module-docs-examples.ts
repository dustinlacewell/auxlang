/**
 * Headless proof that every module-docs example is a real, audible patch.
 * Renders each 2 s: asserts RMS > 0.005 and no NaN. Prints a green/red RMS
 * list and the overall RMS range; exits non-zero on any failure.
 *
 *   npx tsx src/tests/scratch/module-docs-examples.ts
 */

import "@/core3/modules/all";

import * as api from "@/core3/api";
import { compile, runEval } from "@/core3/api";
import type { Program } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { EXAMPLES } from "@/ui/module-docs/examples";

const API_NAMES = Object.keys(api);
const API_VALUES = API_NAMES.map((n) => (api as Record<string, unknown>)[n]);

function evalPatch(source: string): Program {
	const patch = new Function(...API_NAMES, source) as (...a: unknown[]) => void;
	return compile(runEval(() => patch(...API_VALUES)));
}

function rms(buf: Float32Array): number {
	let s = 0;
	for (const x of buf) s += x * x;
	return Math.sqrt(s / Math.max(1, buf.length));
}

function anyNaN(buf: Float32Array): boolean {
	for (const x of buf) if (!Number.isFinite(x)) return true;
	return false;
}

const RMS_MIN = 0.005;
let failures = 0;
let minRms = Number.POSITIVE_INFINITY;
let maxRms = 0;

for (const ex of EXAMPLES) {
	const label = `[${ex.section}] ${ex.title}`;
	let program: Program;
	try {
		program = evalPatch(ex.code);
	} catch (err) {
		console.log(`  RED  ${label} — eval error: ${err instanceof Error ? err.message : err}`);
		failures++;
		continue;
	}
	const { l, r } = render(program, 2);
	const level = rms(l);
	const nan = anyNaN(l) || anyNaN(r);
	const quiet = level <= RMS_MIN;

	const ok = !nan && !quiet;
	if (!ok) failures++;
	else {
		minRms = Math.min(minRms, level);
		maxRms = Math.max(maxRms, level);
	}

	const tag = ok ? "GREEN" : "RED  ";
	const notes = [nan ? "NaN!" : "", quiet ? `quiet ${level.toFixed(4)}` : ""]
		.filter(Boolean)
		.join(" ");
	console.log(`  ${tag} ${label} — rms ${level.toFixed(4)} ${notes}`);
}

console.log("");
console.log(
	`${EXAMPLES.length} examples, ${EXAMPLES.length - failures} green, ${failures} red. ` +
		`RMS range ${minRms.toFixed(4)}..${maxRms.toFixed(4)}`,
);

if (failures > 0) process.exit(1);
