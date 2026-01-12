import { beforeEach, describe, expect, it } from "vitest";

import { device } from "../../descriptor/device";
import { resetIdCounter } from "../../descriptor/identity";
import { inputs } from "../../descriptor/inputs";
import { clearRegistry } from "../../descriptor/registry";
import { reify } from "../../graph/reify";
import { diffGraphs, graphsEquivalent } from "../../graph/diff/diff";

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

const seqSpec = {
	inputs: inputs({ trig: 0 }),
	config: {
		pattern: () => [{ type: "note" as const, freq: 440 }],
	},
	outputs: ["cv", "gate"] as const,
	defaultInput: "trig" as const,
	defaultOutput: "cv" as const,
	process: () => ({ cv: 0, gate: 0 }),
};

describe("diffGraphs", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	it("identical graphs have all nodes matched", () => {
		const osc = device(oscSpec);
		const filter = device(filterSpec)(osc.out);
		const graph1 = reify(filter);

		resetIdCounter();
		clearRegistry();

		const osc2 = device(oscSpec);
		const filter2 = device(filterSpec)(osc2.out);
		const graph2 = reify(filter2);

		const diff = diffGraphs(graph1, graph2);

		expect(diff.matched.size).toBe(2);
		expect(diff.added).toHaveLength(0);
		expect(diff.removed).toHaveLength(0);
	});

	it("changing constant values preserves node matching", () => {
		// osc(440) -> filter(1000) vs osc(880) -> filter(2000)
		const osc1 = device(oscSpec).pitch(440);
		const filter1 = device(filterSpec)(osc1.out).cutoff(1000);
		const graph1 = reify(filter1);

		resetIdCounter();
		clearRegistry();

		const osc2 = device(oscSpec).pitch(880);
		const filter2 = device(filterSpec)(osc2.out).cutoff(2000);
		const graph2 = reify(filter2);

		const diff = diffGraphs(graph1, graph2);

		expect(diff.matched.size).toBe(2);
		expect(diff.added).toHaveLength(0);
		expect(diff.removed).toHaveLength(0);

		// Verify the matching is correct
		const filterMatch = diff.matched.get(filter2._state.id);
		expect(filterMatch?.oldId).toBe(filter1._state.id);
	});

	it("changing config preserves node matching", () => {
		// seq with pattern A vs seq with pattern B
		const pattern1 = () => [{ type: "note" as const, freq: 440 }];
		const pattern2 = () => [{ type: "note" as const, freq: 880 }];

		const seq1 = device(seqSpec).pattern(pattern1);
		const graph1 = reify(seq1);

		resetIdCounter();
		clearRegistry();

		const seq2 = device(seqSpec).pattern(pattern2);
		const graph2 = reify(seq2);

		const diff = diffGraphs(graph1, graph2);

		expect(diff.matched.size).toBe(1);
		expect(diff.added).toHaveLength(0);
		expect(diff.removed).toHaveLength(0);
	});

	it("adding a node is detected", () => {
		// osc vs osc -> filter
		const osc1 = device(oscSpec);
		const graph1 = reify(osc1);

		resetIdCounter();
		clearRegistry();

		const osc2 = device(oscSpec);
		const filter2 = device(filterSpec)(osc2.out);
		const graph2 = reify(filter2);

		const diff = diffGraphs(graph1, graph2);

		expect(diff.matched.size).toBe(1); // osc matches
		expect(diff.added).toHaveLength(1); // filter is new
		expect(diff.added[0]).toBe(filter2._state.id);
		expect(diff.removed).toHaveLength(0);
	});

	it("removing a node is detected", () => {
		// osc -> filter vs osc
		const osc1 = device(oscSpec);
		const filter1 = device(filterSpec)(osc1.out);
		const graph1 = reify(filter1);

		resetIdCounter();
		clearRegistry();

		const osc2 = device(oscSpec);
		const graph2 = reify(osc2);

		const diff = diffGraphs(graph1, graph2);

		expect(diff.matched.size).toBe(1); // osc matches
		expect(diff.added).toHaveLength(0);
		expect(diff.removed).toHaveLength(1); // filter is removed
		expect(diff.removed[0]).toBe(filter1._state.id);
	});

	it("replacing a node is detected as add + remove", () => {
		// osc -> filter vs osc -> gain
		const osc1 = device(oscSpec);
		const filter = device(filterSpec)(osc1.out);
		const graph1 = reify(filter);

		resetIdCounter();
		clearRegistry();

		const osc2 = device(oscSpec);
		const gain = device(gainSpec)(osc2.out);
		const graph2 = reify(gain);

		const diff = diffGraphs(graph1, graph2);

		expect(diff.matched.size).toBe(1); // osc matches
		expect(diff.added).toHaveLength(1); // gain is new
		expect(diff.added[0]).toBe(gain._state.id);
		expect(diff.removed).toHaveLength(1); // filter is removed
		expect(diff.removed[0]).toBe(filter._state.id);
	});

	it("reordering connections changes topology", () => {
		// filter(osc) vs filter.cutoff(osc)
		const osc1 = device(oscSpec);
		const filter1 = device(filterSpec)(osc1.out);
		const graph1 = reify(filter1);

		resetIdCounter();
		clearRegistry();

		const osc2 = device(oscSpec);
		const filter2 = device(filterSpec).cutoff(osc2.out);
		const graph2 = reify(filter2);

		const diff = diffGraphs(graph1, graph2);

		// osc matches (same topology at that position)
		expect(diff.matched.size).toBe(1);
		// Both filters are different topology
		expect(diff.added).toHaveLength(1);
		expect(diff.removed).toHaveLength(1);
	});
});

describe("graphsEquivalent", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	it("identical structures are equivalent", () => {
		const osc1 = device(oscSpec);
		const filter1 = device(filterSpec)(osc1.out);
		const graph1 = reify(filter1);

		resetIdCounter();
		clearRegistry();

		const osc2 = device(oscSpec);
		const filter2 = device(filterSpec)(osc2.out);
		const graph2 = reify(filter2);

		expect(graphsEquivalent(graph1, graph2)).toBe(true);
	});

	it("different structures are not equivalent", () => {
		const osc1 = device(oscSpec);
		const graph1 = reify(osc1);

		resetIdCounter();
		clearRegistry();

		const osc2 = device(oscSpec);
		const filter2 = device(filterSpec)(osc2.out);
		const graph2 = reify(filter2);

		expect(graphsEquivalent(graph1, graph2)).toBe(false);
	});

	it("same structure with different values is equivalent", () => {
		const osc1 = device(oscSpec).pitch(440);
		const graph1 = reify(osc1);

		resetIdCounter();
		clearRegistry();

		const osc2 = device(oscSpec).pitch(880);
		const graph2 = reify(osc2);

		expect(graphsEquivalent(graph1, graph2)).toBe(true);
	});
});
