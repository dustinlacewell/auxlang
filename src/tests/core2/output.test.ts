/**
 * Tests for out() - creates output nodes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { device } from "../../core2/device/device";
import { out } from "../../core2/graph/out";
import { resetBuilder, getBuilder } from "../../core2/graph/graph-builder";

describe("out()", () => {
	let saw: ReturnType<typeof device>;

	beforeEach(() => {
		resetBuilder();

		saw = device("saw", {
			inputs: { freq: 440 },
			outputs: ["audio"],
			defaultInput: "freq",
			defaultOutput: "audio",
			process: () => ({ audio: 0 }),
		});
	});

	describe("single output", () => {
		it("creates an out node", () => {
			const s = saw(440);
			out(s);

			const graph = getBuilder().build();
			const outNode = graph.nodes.find((n) => n.device === "out");
			expect(outNode).toBeDefined();
			expect(outNode?.inputs.input).toEqual({ ref: s.id, out: "audio" });
		});

		it("works with method chaining via .out()", () => {
			saw(440).out();

			const graph = getBuilder().build();
			// saw node + out node
			expect(graph.nodes).toHaveLength(2);
			const outNode = graph.nodes.find((n) => n.device === "out");
			expect(outNode).toBeDefined();
		});
	});

	describe("poly output", () => {
		it("creates out node with array input for poly", () => {
			const s1 = saw(440);
			const s2 = saw(550);
			out([s1, s2]);

			const graph = getBuilder().build();
			const outNode = graph.nodes.find((n) => n.device === "out");
			expect(outNode).toBeDefined();
			expect(outNode?.inputs.input).toEqual([
				{ ref: s1.id, out: "audio" },
				{ ref: s2.id, out: "audio" },
			]);
		});
	});

	describe("multiple out() calls", () => {
		it("creates multiple out nodes", () => {
			const s1 = saw(440);
			const s2 = saw(550);
			out(s1);
			out(s2);

			const graph = getBuilder().build();
			const outNodes = graph.nodes.filter((n) => n.device === "out");
			expect(outNodes).toHaveLength(2);
		});
	});
});
