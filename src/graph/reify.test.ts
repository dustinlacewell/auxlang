import { beforeEach, describe, expect, it } from "vitest";

import { device } from "../descriptor/device";
import { resetIdCounter } from "../descriptor/identity";
import { inputs } from "../descriptor/inputs";
import { clearRegistry } from "../descriptor/registry";
import { reify } from "./reify";

const oscSpec = {
	inputs: inputs({ pitch: 440 }),
	outputs: ["out"] as const,
	defaultInput: "pitch" as const,
	defaultOutput: "out" as const,
	process: () => ({ out: 0 }),
};

const filterSpec = {
	inputs: inputs({ input: 0, cutoff: 1000 }),
	outputs: ["out"] as const,
	defaultInput: "input" as const,
	defaultOutput: "out" as const,
	process: () => ({ out: 0 }),
};

/** Helper to get first node from graph, throwing if empty */
function firstNode(graph: ReturnType<typeof reify>) {
	const node = graph.nodes[0];
	if (!node) throw new Error("Expected at least one node");
	return node;
}

/** Helper to get node at index from graph, throwing if missing */
function nodeAt(graph: ReturnType<typeof reify>, index: number) {
	const node = graph.nodes[index];
	if (!node) throw new Error(`Expected node at index ${index}`);
	return node;
}

/** Helper to get a config function from a node, throwing if missing */
function getConfigFn(node: ReturnType<typeof firstNode>, name: string) {
	const fn = node.configBindings[name];
	if (!fn) throw new Error(`Expected config ${name}`);
	return fn;
}

describe("reify", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	it("reifies a single device", () => {
		const osc = device(oscSpec);
		const graph = reify(osc);

		expect(graph.nodes).toHaveLength(1);
		const node = firstNode(graph);
		expect(node.id).toBe(osc._state.id);
		expect(graph.outputNodeId).toBe(osc._state.id);
	});

	it("resolves constant inputs", () => {
		const osc = device(oscSpec);
		const graph = reify(osc);

		const node = firstNode(graph);
		expect(node.inputBindings.pitch).toEqual({ type: "constant", value: 440 });
	});

	it("resolves bound inputs", () => {
		const osc = device(oscSpec);
		const oscBound = osc.pitch(880);
		const graph = reify(oscBound);

		const node = firstNode(graph);
		expect(node.inputBindings.pitch).toEqual({ type: "constant", value: 880 });
	});

	it("reifies connected devices in dependency order", () => {
		const osc = device(oscSpec);
		const filter = device(filterSpec);
		const connected = filter(osc.out);

		const graph = reify(connected);

		expect(graph.nodes).toHaveLength(2);
		// Dependency (osc) comes before dependent (filter)
		expect(nodeAt(graph, 0).id).toBe(osc._state.id);
		expect(nodeAt(graph, 1).id).toBe(connected._state.id);
	});

	it("resolves connections between devices", () => {
		const osc = device(oscSpec);
		const filter = device(filterSpec);
		const connected = filter(osc.out);

		const graph = reify(connected);

		const filterNode = nodeAt(graph, 1);
		expect(filterNode.inputBindings.input).toEqual({
			type: "connection",
			nodeId: osc._state.id,
			output: "out",
		});
	});

	it("deduplicates shared descriptors", () => {
		const osc = device(oscSpec);
		const filter1 = device(filterSpec)(osc.out);
		const _filter2 = device(filterSpec)(osc.out);

		// Reify filter1 and verify osc appears exactly once
		const graph = reify(filter1);

		const oscNodes = graph.nodes.filter((n) => n.id === osc._state.id);
		expect(oscNodes).toHaveLength(1);
	});
});

const oscWithConfigSpec = {
	inputs: inputs({ pitch: 440 }),
	config: {
		waveform: (phase: number) => Math.sin(phase * Math.PI * 2),
	},
	outputs: ["out"] as const,
	defaultInput: "pitch" as const,
	defaultOutput: "out" as const,
	process: () => ({ out: 0 }),
};

describe("reify with config", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	it("resolves default config", () => {
		const osc = device(oscWithConfigSpec);
		const graph = reify(osc);

		const node = firstNode(graph);
		const waveform = getConfigFn(node, "waveform");
		expect(waveform).toBeDefined();
		expect(typeof waveform).toBe("function");
		// Should be the default waveform
		expect(waveform(0.25)).toBeCloseTo(1);
	});

	it("resolves bound config", () => {
		const osc = device(oscWithConfigSpec);
		const squareWave = (phase: number) => (phase < 0.5 ? 1 : -1);
		const oscSquare = osc.waveform(squareWave);
		const graph = reify(oscSquare);

		const node = firstNode(graph);
		const waveform = getConfigFn(node, "waveform");
		expect(waveform).toBe(squareWave);
		expect(waveform(0.25)).toBe(1);
		expect(waveform(0.75)).toBe(-1);
	});

	it("preserves config through connections", () => {
		const osc = device(oscWithConfigSpec);
		const squareWave = (phase: number) => (phase < 0.5 ? 1 : -1);
		const oscSquare = osc.waveform(squareWave);
		const filter = device(filterSpec)(oscSquare.out);

		const graph = reify(filter);

		// Find the osc node
		const oscNode = graph.nodes.find((n) => n.id === oscSquare._state.id);
		expect(oscNode).toBeDefined();
		expect(oscNode?.configBindings.waveform).toBe(squareWave);
	});
});

describe("reify validation", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	it("throws on invalid output name in OutputRef", () => {
		const osc = device(oscSpec);
		const filter = device(filterSpec);

		// Manually create an invalid OutputRef (output "bogus" doesn't exist on osc)
		const invalidRef = { descriptorId: osc._state.id, outputName: "bogus" };
		const connected = filter(invalidRef as any);

		expect(() => reify(connected)).toThrow(/bogus.*not.*output/i);
	});

	it("accepts valid output names", () => {
		const osc = device(oscSpec);
		const filter = device(filterSpec);

		// Use the valid "out" output
		const connected = filter(osc.out);

		expect(() => reify(connected)).not.toThrow();
	});

	it("throws helpful error with available outputs listed", () => {
		const multiOutput = device({
			inputs: inputs({ freq: 440 }),
			outputs: ["audio", "cv", "gate"] as const,
			defaultInput: "freq" as const,
			defaultOutput: "audio" as const,
			process: () => ({ audio: 0, cv: 0, gate: 0 }),
		});
		const filter = device(filterSpec);

		// Try to use non-existent output "trig"
		const invalidRef = { descriptorId: multiOutput._state.id, outputName: "trig" };
		const connected = filter(invalidRef as any);

		try {
			reify(connected);
			expect.fail("Should have thrown");
		} catch (e: any) {
			expect(e.message).toContain("trig");
			expect(e.message).toContain("audio");
			expect(e.message).toContain("cv");
			expect(e.message).toContain("gate");
		}
	});
});
