/**
 * `Math.random()` inside a patch-defined tick is the module's seeded stream
 * (MANIFESTO §5.1): each instance and each lane gets its own, the same patch
 * and seed reproduce it, and re-eval continues it.
 */

import { describe, expect, it } from "vitest";

import "@/engine/library/all";
import { defmod, out, runProgram, seq, tempo } from "@/engine/api";
import { getRegistry } from "@/engine/dsp/define";
import { InterpreterEngine } from "@/engine/runtime/interpreter-engine";
import { withProgramSpecs } from "@/engine/runtime/hydrate-specs";
import type { Program } from "@/engine/types";
import { BACKENDS, type TestEngine } from "./backends";

const SAMPLES = 1000;

/** Two `jitter` instances; the first runs two lanes (a two-note chord feeds it). */
function patch(seed: number): Program {
	return runProgram(
		() => {
			const jitter = defmod("jitter", { cat: "sources" }, () => {
				return ({ in: x = 0 }) => x * 0 + Math.random();
			});
			tempo(120);
			out(jitter({ in: seq("[c3,e3]") }));
			out(jitter({ in: 0 }));
		},
		{ seed },
	);
}

function engine(program: Program, prev?: ReturnType<InterpreterEngine["collectState"]>): InterpreterEngine {
	return new InterpreterEngine(program, 48000, withProgramSpecs(getRegistry(), program), prev);
}

/** Each (node, lane) of `jitter`, sampled for `samples` ticks. */
function taps(e: TestEngine, program: Program, samples = SAMPLES): number[][] {
	const sites = program.nodes.flatMap((n, i) =>
		n.module === "jitter" ? n.lanes.map((_, lane) => [i, lane] as const) : [],
	);
	const series = sites.map(() => [] as number[]);
	const frame = new Float32Array(2);
	for (let k = 0; k < samples; k++) {
		e.tick(frame);
		sites.forEach(([node, lane], j) => series[j]?.push(e.peek(node, "out", lane)));
	}
	return series;
}

describe("Math.random() in a patch-defined tick", () => {
	it("gives each instance and each lane its own stream", () => {
		const program = patch(1);
		const [lane0, lane1, other] = taps(engine(program), program);
		expect(lane0).toHaveLength(SAMPLES);
		expect(lane0).not.toEqual(lane1);
		expect(lane0).not.toEqual(other);
		expect(new Set(lane0).size).toBeGreaterThan(SAMPLES / 2);
	});

	it("reproduces with the same seed and changes with another", () => {
		const run = (seed: number) => taps(engine(patch(seed)), patch(seed));
		expect(run(42)).toEqual(run(42));
		expect(run(42)).not.toEqual(run(43));
	});

	it.each(BACKENDS)("continues across re-eval instead of restarting ($name)", (backend) => {
		const program = patch(1);
		const registry = withProgramSpecs(getRegistry(), program);
		const reference = backend.create(program, 48000, registry);
		const fromStart = taps(reference, program);
		const continued = taps(reference, program);

		const before = backend.create(program, 48000, registry);
		taps(before, program);
		const after = backend.swap(patch(1), 48000, registry, before);
		const swapped = taps(after, program);

		expect(swapped).toEqual(continued);
		expect(swapped).not.toEqual(fromStart);
	});
});
