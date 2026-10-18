/**
 * Random tick programs: when the shared checker accepts a generated program,
 * WASM compiles it and renders it bit-identical to the interpreter (outputs
 * and lane state) over uneven blocks. A program the checker refuses is
 * skipped. Fixed seeds keep the suite reproducible; one rotating seed, named
 * in its test title, explores further on every run.
 */

import "@/library/all";

import { describe, it } from "vitest";
import { evalInternal } from "../../testing/internal-module";
import { expectIdentical } from "../../testing/differential-harness";
import { generatePatch } from "./tick-generator";

const FIXED_SEEDS = Array.from({ length: 100 }, (_, k) => k + 1);
const ROTATING_SEED = Date.now() % 2 ** 31;
const SAMPLES = 1024;

function expectAgreement(seed: number): void {
	const source = generatePatch(seed);
	let program: ReturnType<typeof evalInternal>;
	try {
		program = evalInternal(source);
	} catch {
		return; // refused by the checker: neither backend runs it
	}
	expectIdentical(program, SAMPLES);
}

describe("generated tick programs: checker accepts ⇒ WASM matches the interpreter", () => {
	for (const seed of FIXED_SEEDS) it(`seed ${seed}`, () => expectAgreement(seed));
	it(`rotating seed ${ROTATING_SEED}`, () => expectAgreement(ROTATING_SEED));
});
