/**
 * Feedback survives a swap (MANIFESTO §6.2): a z-edge reads its source's
 * previous-sample output, and the new engine gets that sample from the old
 * one, so an unchanged re-eval of a `loop` patch is bit-exact — with the
 * interpreter, the generated driver and WASM.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { factory, loop, runProgram } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import type { Program } from "@/core3/types";
import { type Backend, JS_BACKEND, type TestEngine, WASM_BACKEND } from "./backends";

const SR = 48000;
const HEAD = 3000;
const TAIL = 2000;

const CODEGEN: Backend = {
	name: "codegen",
	create: (program, sampleRate, registry, prev) =>
		new Core3Engine(program, sampleRate, registry, prev, { codegen: true }),
	swap: (program, sampleRate, registry, running) =>
		new Core3Engine(program, sampleRate, registry, running.collectState(), { codegen: true }),
};

function run(engine: TestEngine, samples: number): number[] {
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let k = 0; k < samples; k++) {
		engine.tick(frame);
		out.push(frame[0] as number, frame[1] as number);
	}
	return out;
}

/** The tail after an unchanged re-eval, and the same span from an engine that never swapped. */
function tails(patch: () => Program, { create, swap }: Backend) {
	const reference = create(patch(), SR, getRegistry());
	run(reference, HEAD);
	const expected = run(reference, TAIL);
	const first = create(patch(), SR, getRegistry());
	run(first, HEAD);
	const swapped = swap(patch(), SR, getRegistry(), first);
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

describe.each([JS_BACKEND, CODEGEN, WASM_BACKEND])(
	"unchanged re-eval of a loop patch ($name)",
	(backend) => {
		for (const [name, patch] of Object.entries(PATCHES)) {
			it(`${name} is bit-exact`, () => {
				const { expected, got } = tails(patch, backend);
				expect(expected.some((v) => v !== 0)).toBe(true);
				expect(got).toEqual(expected);
			});
		}
	},
);
