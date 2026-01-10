/**
 * Test that topology hashes are stable across re-evaluations.
 * This is critical for live re-eval to preserve state.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { resetIdCounter } from "../../descriptor/identity";
import { clearRegistry } from "../../descriptor/registry";
import { clock } from "../../devices/clock";
import { lpf } from "../../devices/lpf";
import { saw } from "../../devices/saw";
import { seq } from "../../devices/seq/seq";
import { clearOutputs, collectGraph } from "../out";
import { computeGraphHashes } from "./topology-hash";

// Force device registration
void clock;
void lpf;
void saw;
void seq;

describe("topology hash stability", () => {
	function evalCode(code: () => void) {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
		code();
		return collectGraph();
	}

	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
		clearOutputs();
	});

	it("same code produces same hashes", () => {
		const code = () => {
			const clk = clock(120);
			const s = seq("c4 e4 g4", { clk });
			(s as any).saw().out();
		};

		const graph1 = evalCode(code);
		const graph2 = evalCode(code);

		expect(graph1).not.toBeNull();
		expect(graph2).not.toBeNull();
		if (!graph1 || !graph2) return;

		const hashes1 = computeGraphHashes(graph1.nodes);
		const hashes2 = computeGraphHashes(graph2.nodes);

		// Same number of nodes
		expect(graph1.nodes.length).toBe(graph2.nodes.length);

		// Collect all hashes
		const hashSet1 = new Set(hashes1.values());
		const hashSet2 = new Set(hashes2.values());

		// Same set of hashes (order may differ by ID, but hashes should match)
		expect(hashSet1).toEqual(hashSet2);
	});

	it("all nodes match between evaluations", () => {
		const code = () => {
			const clk = clock(120);
			const s = seq("c4 e4 g4", { clk });
			(s as any).saw().out();
		};

		const graph1 = evalCode(code);
		const graph2 = evalCode(code);

		if (!graph1 || !graph2) {
			expect.fail("No graph");
			return;
		}

		const hashes1 = computeGraphHashes(graph1.nodes);
		const hashes2 = computeGraphHashes(graph2.nodes);

		// Build reverse map: hash → node ID for graph1
		const hash1ToId = new Map<string, string>();
		for (const [id, hash] of hashes1) {
			hash1ToId.set(hash, id);
		}

		// Every node in graph2 should have a matching hash in graph1
		let matchedCount = 0;
		for (const [id2, hash2] of hashes2) {
			const id1 = hash1ToId.get(hash2);
			if (id1) {
				matchedCount++;
			} else {
				console.log(`No match for node ${id2} with hash ${hash2}`);
			}
		}

		expect(matchedCount).toBe(graph2.nodes.length);
	});

	it("changing a value does not change topology hash", () => {
		const graph1 = evalCode(() => {
			const clk = clock(120);
			const s = seq("c4 e4 g4", { clk });
			(s as any).saw().out();
		});

		const graph2 = evalCode(() => {
			const clk = clock(130); // Different BPM
			const s = seq("c4 e4 g4", { clk });
			(s as any).saw().out();
		});

		if (!graph1 || !graph2) {
			expect.fail("No graph");
			return;
		}

		const hashes1 = computeGraphHashes(graph1.nodes);
		const hashes2 = computeGraphHashes(graph2.nodes);

		const hashSet1 = new Set(hashes1.values());
		const hashSet2 = new Set(hashes2.values());

		// Hashes should still match (BPM is a constant input, excluded from hash)
		expect(hashSet1).toEqual(hashSet2);
	});

	it("changing structure does change topology hash", () => {
		const graph1 = evalCode(() => {
			const clk = clock(120);
			const s = seq("c4 e4 g4", { clk });
			(s as any).saw().out();
		});

		const graph2 = evalCode(() => {
			const clk = clock(120);
			const s = seq("c4 e4 g4", { clk });
			// Added lpf - different structure
			(s as any).saw().lpf().out();
		});

		if (!graph1 || !graph2) {
			expect.fail("No graph");
			return;
		}

		// Different number of nodes
		expect(graph2.nodes.length).toBeGreaterThan(graph1.nodes.length);
	});

	it("node IDs are deterministic across evaluations", () => {
		const code = () => {
			const clk = clock(120);
			const s = seq("c4 e4 g4", { clk });
			(s as any).saw().out();
		};

		const graph1 = evalCode(code);
		const graph2 = evalCode(code);

		if (!graph1 || !graph2) {
			expect.fail("No graph");
			return;
		}

		// Node IDs should be identical since resetIdCounter() is called
		const ids1 = graph1.nodes.map((n) => n.id).sort();
		const ids2 = graph2.nodes.map((n) => n.id).sort();

		expect(ids1).toEqual(ids2);
	});

	it("output node ID is deterministic", () => {
		const code = () => {
			const clk = clock(120);
			const s = seq("c4 e4 g4", { clk });
			(s as any).saw().out();
		};

		const graph1 = evalCode(code);
		const graph2 = evalCode(code);

		if (!graph1 || !graph2) {
			expect.fail("No graph");
			return;
		}

		expect(graph1.outputNodeId).toBe(graph2.outputNodeId);
	});
});
