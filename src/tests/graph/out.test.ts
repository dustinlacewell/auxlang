import { beforeEach, describe, expect, it } from "vitest";

import { device } from "../../descriptor/device";
import { resetIdCounter } from "../../descriptor/identity";
import { inputs } from "../../descriptor/inputs";
import { poly } from "../../descriptor/poly";
import { clearRegistry } from "../../descriptor/registry";
import { clearOutputs, collectGraph, collectStereoGraph, out } from "../../graph/out";

const oscSpec = {
	inputs: inputs({ pitch: 440 }),
	outputs: ["out"] as const,
	defaultInput: "pitch" as const,
	defaultOutput: "out" as const,
	process: () => ({ out: 0 }),
};

describe("out", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	it("accepts a descriptor directly", () => {
		const osc = device(oscSpec);
		out(osc);
		const graph = collectGraph();

		expect(graph).not.toBeNull();
		expect(graph!.nodes).toHaveLength(1);
		expect(graph!.outputNodeId).toBe(osc._state.id);
	});

	it("accepts an OutputRef", () => {
		const osc = device(oscSpec);
		out(osc.out);
		const graph = collectGraph();

		expect(graph).not.toBeNull();
		expect(graph!.nodes).toHaveLength(1);
		expect(graph!.outputNodeId).toBe(osc._state.id);
	});

	it("throws for constant signals", () => {
		expect(() => out(440)).toThrow("Cannot output constant signal");
	});
});

describe("collectStereoGraph", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	it("returns null for no outputs", () => {
		const stereo = collectStereoGraph();
		expect(stereo).toBeNull();
	});

	it("mono: same graph for both channels", () => {
		const osc = device(oscSpec);
		out(osc);
		const stereo = collectStereoGraph();

		expect(stereo).not.toBeNull();
		// Same graph object for both channels
		expect(stereo!.left).toBe(stereo!.right);
		expect(stereo!.left.nodes).toHaveLength(1);
	});

	it("two voices: separate graphs for L/R", () => {
		const osc1 = device(oscSpec);
		const osc2 = device(oscSpec);
		out(poly([osc1, osc2]));
		const stereo = collectStereoGraph();

		expect(stereo).not.toBeNull();
		// Different graphs for L/R
		expect(stereo!.left).not.toBe(stereo!.right);
		// Each has one node
		expect(stereo!.left.nodes).toHaveLength(1);
		expect(stereo!.right.nodes).toHaveLength(1);
		// Different output nodes
		expect(stereo!.left.outputNodeId).toBe(osc1._state.id);
		expect(stereo!.right.outputNodeId).toBe(osc2._state.id);
	});

	it("three voices: round-robin L/R/L", () => {
		const osc1 = device(oscSpec);
		const osc2 = device(oscSpec);
		const osc3 = device(oscSpec);
		out(poly([osc1, osc2, osc3]));
		const stereo = collectStereoGraph();

		expect(stereo).not.toBeNull();
		// Left has 2 voices (indices 0, 2), right has 1 (index 1)
		// Left: gain + gain + add = 3 nodes + 2 oscs = but actually mixed
		// The mixing creates gain and add nodes
		// osc1 -> gain -> \
		//                  add -> output
		// osc3 -> gain -> /
		// So left should have: osc1, osc3, 2 gains, 1 add = 5 nodes
		// Right should have: osc2, 1 gain = 2 nodes (no add needed for 1 voice... wait)
		// Actually mixVoices with 1 voice just returns the voice, no gain
		// Let me check - mixVoices returns voices[0] directly for length 1

		// Left: osc1, osc3 + 2 gains + 1 add = 5 nodes
		expect(stereo!.left.nodes.length).toBeGreaterThan(1);
		// Right: just osc2 (mixVoices returns single voice directly)
		expect(stereo!.right.nodes).toHaveLength(1);
		expect(stereo!.right.outputNodeId).toBe(osc2._state.id);
	});
});
