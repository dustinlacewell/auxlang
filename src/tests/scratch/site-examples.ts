/**
 * Headless proof that every site example compiles and renders non-silent.
 * Run: npx tsx src/tests/scratch/site-examples.ts
 * Prints RMS per example (each must be > 0.01) and flags any NaN/Inf.
 */

import "@/core3/modules/all";

import * as api from "@/core3/api";
import { compile, runEval } from "@/core3/api";
import type { Program } from "@/core3/api";
import { render } from "@/core3/runtime/render";
import { EXAMPLES } from "@/ui/core3-editor/examples";

const API_NAMES = Object.keys(api);
const API_VALUES = API_NAMES.map((n) => (api as Record<string, unknown>)[n]);

function evalPatch(source: string): Program {
	const patch = new Function(...API_NAMES, source) as (...a: unknown[]) => void;
	return compile(runEval(() => patch(...API_VALUES)));
}

function rms(buf: Float32Array): number {
	let s = 0;
	for (const x of buf) s += x * x;
	return Math.sqrt(s / buf.length);
}

function allFinite(buf: Float32Array): boolean {
	for (const x of buf) if (!Number.isFinite(x)) return false;
	return true;
}

let failed = false;
for (const ex of EXAMPLES) {
	try {
		const program = evalPatch(ex.source);
		const { l, r } = render(program, 2);
		const value = rms(l);
		const finite = allFinite(l) && allFinite(r);
		const ok = value > 0.01 && finite;
		if (!ok) failed = true;
		console.log(
			`${ok ? "OK " : "FAIL"}  ${ex.name.padEnd(24)} RMS=${value.toFixed(4)}${finite ? "" : "  NaN/Inf!"}`,
		);
	} catch (err) {
		failed = true;
		console.log(`FAIL  ${ex.name.padEnd(24)} ${err instanceof Error ? err.message : String(err)}`);
	}
}

process.exit(failed ? 1 : 0);
