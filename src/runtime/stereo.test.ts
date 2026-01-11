import { beforeEach, describe, expect, it } from "vitest";

import { device } from "../descriptor/device";
import { resetIdCounter } from "../descriptor/identity";
import { inputs } from "../descriptor/inputs";
import { poly } from "../descriptor/poly";
import { clearRegistry } from "../descriptor/registry";
import { clearOutputs, collectStereoGraph, out } from "../graph/out";
import { compile } from "./compile";
import { RuntimeGraph } from "./processor/runtime-graph";

// Simple oscillator that outputs its pitch value directly (for testing)
const testOsc = device("testOsc", {
	inputs: inputs({ pitch: 440 }),
	outputs: ["out"] as const,
	defaultInput: "pitch" as const,
	defaultOutput: "out" as const,
	process: (inp) => ({ out: inp.pitch as number }),
});

describe("stereo runtime", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	it("mono produces same output for L and R", async () => {
		const osc = testOsc(440);
		out(osc);

		const stereo = collectStereoGraph();
		expect(stereo).not.toBeNull();

		const leftCompiled = await compile(stereo!.left);
		const rightCompiled = await compile(stereo!.right);

		const leftGraph = new RuntimeGraph(leftCompiled, new Map());
		const rightGraph = new RuntimeGraph(rightCompiled, new Map());

		const leftSample = leftGraph.processSample(44100);
		const rightSample = rightGraph.processSample(44100);

		// Same graph, same output
		expect(leftSample).toBe(rightSample);
		expect(leftSample).toBe(440);
	});

	it("two voices produce different outputs for L and R", async () => {
		const osc1 = testOsc(100); // Will go to left
		const osc2 = testOsc(200); // Will go to right
		out(poly([osc1, osc2]));

		const stereo = collectStereoGraph();
		expect(stereo).not.toBeNull();

		const leftCompiled = await compile(stereo!.left);
		const rightCompiled = await compile(stereo!.right);

		const leftGraph = new RuntimeGraph(leftCompiled, new Map());
		const rightGraph = new RuntimeGraph(rightCompiled, new Map());

		const leftSample = leftGraph.processSample(44100);
		const rightSample = rightGraph.processSample(44100);

		// Different voices, different outputs
		expect(leftSample).toBe(100);
		expect(rightSample).toBe(200);
	});

	it("three voices: L gets 0,2 mixed, R gets 1", async () => {
		const osc1 = testOsc(100); // Index 0 -> left
		const osc2 = testOsc(200); // Index 1 -> right
		const osc3 = testOsc(300); // Index 2 -> left
		out(poly([osc1, osc2, osc3]));

		const stereo = collectStereoGraph();
		expect(stereo).not.toBeNull();

		const leftCompiled = await compile(stereo!.left);
		const rightCompiled = await compile(stereo!.right);

		const leftGraph = new RuntimeGraph(leftCompiled, new Map());
		const rightGraph = new RuntimeGraph(rightCompiled, new Map());

		const leftSample = leftGraph.processSample(44100);
		const rightSample = rightGraph.processSample(44100);

		// Right channel has only osc2 (no mixing for single voice)
		expect(rightSample).toBe(200);

		// Left channel has osc1 and osc3 mixed with 1/sqrt(2) scaling each
		// (100 + 300) * (1/sqrt(2)) = 400 * 0.707 ≈ 282.8
		// Actually: each is scaled by 1/sqrt(2), then summed
		// 100 * 0.707 + 300 * 0.707 = 70.7 + 212.1 = 282.8
		const expectedLeft = (100 + 300) / Math.sqrt(2);
		expect(leftSample).toBeCloseTo(expectedLeft, 1);
	});
});
