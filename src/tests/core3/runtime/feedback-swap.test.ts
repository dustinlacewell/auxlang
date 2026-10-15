/**
 * Feedback survives a swap (MANIFESTO §6.2): a z-edge reads its source's
 * previous-sample output, and the new engine gets that sample from the old
 * one, so an unchanged re-eval of a `loop` patch is bit-exact — with the
 * interpreter and with the generated driver.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { factory, loop, runProgram } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import type { Program } from "@/core3/types";

const SR = 48000;
const HEAD = 3000;
const TAIL = 2000;

function run(engine: Core3Engine, samples: number): number[] {
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let k = 0; k < samples; k++) {
		engine.tick(frame);
		out.push(frame[0] as number, frame[1] as number);
	}
	return out;
}

/** The tail after an unchanged re-eval, and the same span from an engine that never swapped. */
function tails(patch: () => Program, codegen: boolean) {
	const reference = new Core3Engine(patch(), SR, getRegistry(), undefined, { codegen });
	run(reference, HEAD);
	const expected = run(reference, TAIL);
	const first = new Core3Engine(patch(), SR, getRegistry(), undefined, { codegen });
	run(first, HEAD);
	const swapped = new Core3Engine(patch(), SR, getRegistry(), first.collectState(), { codegen });
	return { expected, got: run(swapped, TAIL) };
}

const PATCHES: Record<string, () => Program> = {
	"single-node loop": () =>
		runProgram(() => {
			loop((fb) => fb.add(factory("sin")(60)))
				.mul(0.01)
				.out();
		}),
	"multi-node loop": () =>
		runProgram(() => {
			loop((fb) => factory("sin")(48).add(fb.lpf(2000).mul(0.9)))
				.mul(0.1)
				.out();
		}),
};

describe.each([false, true])("unchanged re-eval of a loop patch (codegen %s)", (codegen) => {
	for (const [name, patch] of Object.entries(PATCHES)) {
		it(`${name} is bit-exact`, () => {
			const { expected, got } = tails(patch, codegen);
			expect(expected.some((v) => v !== 0)).toBe(true);
			expect(got).toEqual(expected);
		});
	}
});
