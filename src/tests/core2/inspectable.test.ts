/**
 * Tests for inspectability - the main goal of the refactor.
 *
 * The API should produce plain, JSON-serializable data structures
 * that can be console.log'd, visualized, and transformed.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { device } from "../../core2/device/device";
import { inputs } from "../../core2/device/inputs";
import { resetBuilder, getBuilder } from "../../core2/graph/graph-builder";

describe("inspectable graphs", () => {
	let saw: ReturnType<typeof device>;
	let lpf: ReturnType<typeof device>;

	beforeEach(() => {
		resetBuilder();

		saw = device("saw", {
			inputs: inputs({ freq: 440 }),
			outputs: ["audio"],
			defaultInput: "freq",
			defaultOutput: "audio",
			process: () => ({ audio: 0 }),
		});

		lpf = device("lpf", {
			inputs: inputs({ input: 0, cutoff: 1000, resonance: 0 }),
			outputs: ["audio"],
			defaultInput: "input",
			defaultOutput: "audio",
			positionalArgs: ["cutoff", "resonance"],
			process: () => ({ audio: 0 }),
		});
	});

	describe("JSON serialization", () => {
		it("produces JSON-serializable graph", () => {
			saw(440).lpf(800);

			const graph = getBuilder().build();
			const json = JSON.stringify(graph);
			const parsed = JSON.parse(json);

			expect(parsed.nodes).toHaveLength(2);
			expect(parsed.nodes[0].device).toBe("saw");
		});

		it("OutputRefs are plain objects", () => {
			saw(440).lpf(800);

			const graph = getBuilder().build();
			const lpfNode = graph.nodes.find((n) => n.device === "lpf");
			const input = lpfNode?.inputs.input;

			// Should be plain object, not a Proxy or class instance
			expect(input).toEqual({ ref: expect.any(String), out: "audio" });
			expect(Object.getPrototypeOf(input)).toBe(Object.prototype);
		});
	});

	describe("console.log readability", () => {
		it("nodes have readable structure", () => {
			saw(440);

			const graph = getBuilder().build();
			const node = graph.nodes[0];

			// These should all be present and readable
			expect(node).toHaveProperty("id");
			expect(node).toHaveProperty("device", "saw");
			expect(node).toHaveProperty("inputs");
			expect(node).toHaveProperty("config");
		});

		it("graph structure is flat (no nested descriptors)", () => {
			saw(440).lpf(800);

			const graph = getBuilder().build();

			// No nested node structures - just OutputRefs
			for (const node of graph.nodes) {
				for (const [, value] of Object.entries(node.inputs)) {
					if (typeof value === "object" && value !== null && !Array.isArray(value)) {
						// Should be OutputRef, not a Node
						expect(value).toHaveProperty("ref");
						expect(value).toHaveProperty("out");
						expect(value).not.toHaveProperty("device");
					}
				}
			}
		});
	});

	describe("graph traversal", () => {
		it("can find all nodes of a device type", () => {
			saw(440);
			saw(550);
			lpf(800);

			const graph = getBuilder().build();
			const saws = graph.nodes.filter((n) => n.device === "saw");

			expect(saws).toHaveLength(2);
		});

		it("can trace connections", () => {
			saw(440).lpf(800);

			const graph = getBuilder().build();
			const lpfNode = graph.nodes.find((n) => n.device === "lpf")!;
			const inputRef = lpfNode.inputs.input as { ref: string; out: string };

			const sourceNode = graph.nodes.find((n) => n.id === inputRef.ref);
			expect(sourceNode?.device).toBe("saw");
		});
	});
});
