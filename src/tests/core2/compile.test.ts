/**
 * Tests for compile - converts StereoGraph to StereoRuntimeGraph.
 */

import { describe, it, expect } from "vitest";
import { compile } from "../../core2/runtime/compile";
import type { StereoGraph } from "../../core2/graph/expand-poly";

describe("compile", () => {
	describe("basic compilation", () => {
		it("compiles simple graph to runtime", () => {
			const graph: StereoGraph = {
				nodes: [{ id: "saw1", device: "saw", inputs: { freq: 440 }, config: {} }],
				leftOutputIds: ["saw1"],
				rightOutputIds: ["saw1"],
			};

			const runtime = compile(graph);
			expect(runtime.nodes).toHaveLength(1);
			expect(runtime.leftOutputIds).toEqual(["saw1"]);
			expect(runtime.rightOutputIds).toEqual(["saw1"]);
		});

		it("resolves constant inputs", () => {
			const graph: StereoGraph = {
				nodes: [{ id: "saw1", device: "saw", inputs: { freq: 440 }, config: {} }],
				leftOutputIds: ["saw1"],
				rightOutputIds: [],
			};

			const runtime = compile(graph);
			expect(runtime.nodes[0]!.inputSources.freq).toEqual({ type: "constant", value: 440 });
		});

		it("resolves connection inputs", () => {
			const graph: StereoGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: 440 }, config: {} },
					{ id: "lpf1", device: "lpf", inputs: { input: { ref: "saw1", out: "audio" }, cutoff: 800 }, config: {} },
				],
				leftOutputIds: ["lpf1"],
				rightOutputIds: [],
			};

			const runtime = compile(graph);
			const lpfNode = runtime.nodes.find((n) => n.id === "lpf1");
			expect(lpfNode?.inputSources.input).toEqual({ type: "connection", nodeId: "saw1", output: "audio" });
		});

		it("resolves lambda inputs", () => {
			const lambda = () => 440;
			const graph: StereoGraph = {
				nodes: [{ id: "saw1", device: "saw", inputs: { freq: lambda }, config: {} }],
				leftOutputIds: ["saw1"],
				rightOutputIds: [],
			};

			const runtime = compile(graph);
			expect(runtime.nodes[0]!.inputSources.freq).toEqual({ type: "lambda", fn: lambda });
		});
	});

	describe("topological ordering", () => {
		it("orders nodes so dependencies come first", () => {
			// Nodes in wrong order - lpf before saw
			const graph: StereoGraph = {
				nodes: [
					{ id: "lpf1", device: "lpf", inputs: { input: { ref: "saw1", out: "audio" }, cutoff: 800 }, config: {} },
					{ id: "saw1", device: "saw", inputs: { freq: 440 }, config: {} },
				],
				leftOutputIds: ["lpf1"],
				rightOutputIds: [],
			};

			const runtime = compile(graph);
			const sawIndex = runtime.nodes.findIndex((n) => n.id === "saw1");
			const lpfIndex = runtime.nodes.findIndex((n) => n.id === "lpf1");

			expect(sawIndex).toBeLessThan(lpfIndex);
		});
	});

	describe("stereo output", () => {
		it("separates L/R output IDs", () => {
			const graph: StereoGraph = {
				nodes: [
					{ id: "saw1", device: "saw", inputs: { freq: 440 }, config: {} },
					{ id: "saw2", device: "saw", inputs: { freq: 550 }, config: {} },
				],
				leftOutputIds: ["saw1"],
				rightOutputIds: ["saw2"],
			};

			const runtime = compile(graph);
			expect(runtime.leftOutputIds).toEqual(["saw1"]);
			expect(runtime.rightOutputIds).toEqual(["saw2"]);
		});
	});

	describe("config passthrough", () => {
		it("passes config values to runtime nodes", () => {
			const graph: StereoGraph = {
				nodes: [{ id: "seq1", device: "seq", inputs: {}, config: { pattern: "c4 e4 g4" } }],
				leftOutputIds: ["seq1"],
				rightOutputIds: [],
			};

			const runtime = compile(graph);
			expect(runtime.nodes[0]!.config.pattern).toBe("c4 e4 g4");
		});
	});

	describe("error handling", () => {
		it("throws on array input (should be expanded first)", () => {
			const graph: StereoGraph = {
				nodes: [{ id: "saw1", device: "saw", inputs: { freq: [440, 550] }, config: {} }],
				leftOutputIds: ["saw1"],
				rightOutputIds: [],
			};

			expect(() => compile(graph)).toThrow(/array/i);
		});
	});
});
