import { beforeEach, describe, expect, it } from "vitest";

import { device } from "../../descriptor/device";
import { resetIdCounter } from "../../descriptor/identity";
import { inputs } from "../../descriptor/inputs";
import { clearRegistry } from "../../descriptor/registry";
import { reify } from "../reify";
import { computeGraphHashes, computeTopologyHash } from "./topology-hash";

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

const gainSpec = {
	inputs: inputs({ input: 0, amount: 1 }),
	outputs: ["out"] as const,
	defaultInput: "input" as const,
	defaultOutput: "out" as const,
	process: () => ({ out: 0 }),
};

describe("computeTopologyHash", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	it("same device type with same constant inputs has same hash", () => {
		const osc1 = device(oscSpec);
		const osc2 = device(oscSpec);

		const graph1 = reify(osc1);
		const graph2 = reify(osc2);

		const hashes1 = computeGraphHashes(graph1.nodes);
		const hashes2 = computeGraphHashes(graph2.nodes);

		expect(hashes1.get(osc1._state.id)).toBe(hashes2.get(osc2._state.id));
	});

	it("same device type with different constant values has same hash", () => {
		// Changing osc(440) to osc(880) should NOT change topology
		resetIdCounter();
		clearRegistry();
		const osc1 = device(oscSpec).pitch(440);
		const graph1 = reify(osc1);
		const hashes1 = computeGraphHashes(graph1.nodes);

		resetIdCounter();
		clearRegistry();
		const osc2 = device(oscSpec).pitch(880);
		const graph2 = reify(osc2);
		const hashes2 = computeGraphHashes(graph2.nodes);

		expect(hashes1.get(osc1._state.id)).toBe(hashes2.get(osc2._state.id));
	});

	it("different device types have different hashes", () => {
		const osc = device(oscSpec);
		const filter = device(filterSpec);

		const graph1 = reify(osc);
		const graph2 = reify(filter);

		const hashes1 = computeGraphHashes(graph1.nodes);
		const hashes2 = computeGraphHashes(graph2.nodes);

		expect(hashes1.get(osc._state.id)).not.toBe(hashes2.get(filter._state.id));
	});

	it("same chain structure has same hashes", () => {
		// osc -> filter
		resetIdCounter();
		clearRegistry();
		const osc1 = device(oscSpec);
		const filter1 = device(filterSpec)(osc1.out);
		const graph1 = reify(filter1);
		const hashes1 = computeGraphHashes(graph1.nodes);

		resetIdCounter();
		clearRegistry();
		const osc2 = device(oscSpec);
		const filter2 = device(filterSpec)(osc2.out);
		const graph2 = reify(filter2);
		const hashes2 = computeGraphHashes(graph2.nodes);

		// Both oscs should have same hash
		expect(hashes1.get(osc1._state.id)).toBe(hashes2.get(osc2._state.id));
		// Both filters should have same hash
		expect(hashes1.get(filter1._state.id)).toBe(hashes2.get(filter2._state.id));
	});

	it("different chain structure has different hashes", () => {
		// osc -> filter vs osc -> gain
		resetIdCounter();
		clearRegistry();
		const osc1 = device(oscSpec);
		const filter = device(filterSpec)(osc1.out);
		const graph1 = reify(filter);
		const hashes1 = computeGraphHashes(graph1.nodes);

		resetIdCounter();
		clearRegistry();
		const osc2 = device(oscSpec);
		const gain = device(gainSpec)(osc2.out);
		const graph2 = reify(gain);
		const hashes2 = computeGraphHashes(graph2.nodes);

		// Oscs still have same hash (same topology position)
		expect(hashes1.get(osc1._state.id)).toBe(hashes2.get(osc2._state.id));
		// Filter and gain have different hashes (different device types)
		expect(hashes1.get(filter._state.id)).not.toBe(hashes2.get(gain._state.id));
	});

	it("different input connections produce different hashes", () => {
		// filter(osc.out) vs filter.cutoff(osc.out)
		resetIdCounter();
		clearRegistry();
		const osc1 = device(oscSpec);
		const filter1 = device(filterSpec)(osc1.out); // osc -> filter.input
		const graph1 = reify(filter1);
		const hashes1 = computeGraphHashes(graph1.nodes);

		resetIdCounter();
		clearRegistry();
		const osc2 = device(oscSpec);
		const filter2 = device(filterSpec).cutoff(osc2.out); // osc -> filter.cutoff
		const graph2 = reify(filter2);
		const hashes2 = computeGraphHashes(graph2.nodes);

		// Filters have different hashes (different input structure)
		expect(hashes1.get(filter1._state.id)).not.toBe(hashes2.get(filter2._state.id));
	});
});

describe("computeGraphHashes", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	it("computes hashes for all nodes in graph", () => {
		const osc = device(oscSpec);
		const filter = device(filterSpec)(osc.out);
		const gain = device(gainSpec)(filter.out);

		const graph = reify(gain);
		const hashes = computeGraphHashes(graph.nodes);

		expect(hashes.size).toBe(3);
		expect(hashes.has(osc._state.id)).toBe(true);
		expect(hashes.has(filter._state.id)).toBe(true);
		expect(hashes.has(gain._state.id)).toBe(true);
	});

	it("hashes are deterministic", () => {
		const osc = device(oscSpec);
		const filter = device(filterSpec)(osc.out);
		const graph = reify(filter);

		const hashes1 = computeGraphHashes(graph.nodes);
		const hashes2 = computeGraphHashes(graph.nodes);

		expect(hashes1.get(osc._state.id)).toBe(hashes2.get(osc._state.id));
		expect(hashes1.get(filter._state.id)).toBe(hashes2.get(filter._state.id));
	});
});
