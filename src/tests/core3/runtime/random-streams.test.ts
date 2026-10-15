/**
 * Random streams (MANIFESTO §5.1, §7): every random-using module instance and
 * every lane draws its own stream from (patch seed, identity, lane); the same
 * patch and seed reproduce it exactly; re-eval continues it.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { factory, runProgram } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { renderTap } from "@/core3/runtime/render";
import type { Program } from "@/core3/types";
import { BACKENDS, type TestEngine } from "./backends";
import { c, pnode } from "./helpers";

const SAMPLES = 2000;

/** Arguments per module: drums need a trigger to sound. */
const ARGS: Record<string, Record<string, number>> = { noise: {}, snare: { trig: 1 } };

/** Two identical instances of `module`, each its own root. */
function twoInstances(module: string, seed?: number): Program {
	const make = factory(module);
	const args = ARGS[module] ?? {};
	return runProgram(
		() => {
			make(args).out();
			make(args).out();
		},
		seed === undefined ? {} : { seed },
	);
}

/** Indices of every node running `module`. */
function nodesOf(program: Program, module: string): number[] {
	return program.nodes.flatMap((n, i) => (n.module === module ? [i] : []));
}

function tapAll(program: Program, module: string): Float32Array[] {
	return nodesOf(program, module).map((i) => renderTap(program, i, "out", 0, SAMPLES));
}

/** One noise node with two identical lanes. */
function twoLaneNoise(seed: number): Program {
	const lane = { min: c(-1), max: c(1) };
	return { nodes: [pnode("noise", [lane, lane], { place: "hiss" })], outs: [], seed };
}

function tapLanes(program: Program): Float32Array[] {
	return [0, 1].map((lane) => renderTap(program, 0, "out", lane, SAMPLES));
}

function run(engine: TestEngine, node: number, samples: number): number[] {
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let k = 0; k < samples; k++) {
		engine.tick(frame);
		out.push(engine.peek(node, "out", 0));
	}
	return out;
}

describe.each(["noise", "snare"])("%s random streams", (module) => {
	it("two instances play different streams", () => {
		const [a, b] = tapAll(twoInstances(module), module);
		expect(a).toBeDefined();
		expect(a).not.toEqual(b);
	});

	it("the same patch and seed reproduce both instances exactly", () => {
		expect(tapAll(twoInstances(module, 42), module)).toEqual(
			tapAll(twoInstances(module, 42), module),
		);
	});

	it("a different seed changes the streams", () => {
		expect(tapAll(twoInstances(module, 1), module)).not.toEqual(
			tapAll(twoInstances(module, 2), module),
		);
	});

	it.each(BACKENDS)("re-eval continues the stream rather than restarting it ($name)", (backend) => {
		const registry = getRegistry();
		const node = nodesOf(twoInstances(module), module)[0] as number;

		const reference = backend.create(twoInstances(module), 48000, registry);
		const fromStart = run(reference, node, SAMPLES);
		const continued = run(reference, node, SAMPLES);

		const before = backend.create(twoInstances(module), 48000, registry);
		run(before, node, SAMPLES);
		const after = backend.swap(twoInstances(module), 48000, registry, before);
		const swapped = run(after, node, SAMPLES);

		expect(swapped).toEqual(continued);
		expect(swapped).not.toEqual(fromStart);
	});
});

describe("noise lanes", () => {
	it("two lanes of one instance play different streams", () => {
		const [a, b] = tapLanes(twoLaneNoise(1));
		expect(a).not.toEqual(b);
	});

	it("the same seed reproduces both lanes exactly", () => {
		expect(tapLanes(twoLaneNoise(5))).toEqual(tapLanes(twoLaneNoise(5)));
	});
});
