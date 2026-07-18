/**
 * Headless proof that every module-docs example is a real, audible patch.
 * Renders each 2 s: asserts RMS > 0.005 and no NaN. Prints a green/red RMS
 * list and the overall RMS range; exits non-zero on any failure.
 *
 *   npx tsx src/tests/scratch/module-docs-examples.ts
 */

import type { Program } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { EXAMPLES } from "@/ui/module-docs/examples";

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

// Pan cards route l/r into the master's stereo jacks — verify real separation,
// not just non-silence. The modulated card must trade L↔R; the default card
// (center) must be balanced.
console.log("");
console.log("pan L/R separation:");
for (const ex of EXAMPLES.filter((e) => e.title.startsWith("pan"))) {
	const { l, r } = render(evalPatch(ex.code), 3);
	const win = Math.round(0.05 * 48000);
	let maxLoverR = 0;
	let maxRoverL = 0;
	for (let s = 0; s + win <= l.length; s += win) {
		const rl = rms(l.subarray(s, s + win));
		const rr = rms(r.subarray(s, s + win));
		if (rr > 1e-4) maxLoverR = Math.max(maxLoverR, rl / rr);
		if (rl > 1e-4) maxRoverL = Math.max(maxRoverL, rr / rl);
	}
	const moves = maxLoverR > 3 && maxRoverL > 3;
	const centered = Math.abs(rms(l) - rms(r)) < rms(l) * 0.05;
	const wantsMotion = ex.title.includes("modulated");
	const ok = wantsMotion ? moves : centered;
	if (!ok) failures++;
	console.log(
		`  ${ok ? "GREEN" : "RED  "} ${ex.title} — ` +
			`maxL/R ${maxLoverR.toFixed(1)}, maxR/L ${maxRoverL.toFixed(1)}, ` +
			`${wantsMotion ? "expect motion" : "expect centered"}`,
	);
}

if (failures > 0) process.exit(1);
