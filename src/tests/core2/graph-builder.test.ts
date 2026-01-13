/**
 * Tests for GraphBuilder - accumulates nodes during API execution.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { getBuilder, resetBuilder } from "../../core2/graph/graph-builder";

describe("GraphBuilder", () => {
	beforeEach(() => {
		resetBuilder();
	});

	describe("node accumulation", () => {
		it("accumulates nodes added via addNode", () => {
			const builder = getBuilder();
			builder.addNode({ id: "saw1", device: "saw", inputs: { freq: 440 }, config: {} });
			builder.addNode({ id: "lpf1", device: "lpf", inputs: { input: { ref: "saw1", out: "audio" } }, config: {} });

			const graph = builder.build();
			expect(graph.nodes).toHaveLength(2);
			expect(graph.nodes[0]!.id).toBe("saw1");
			expect(graph.nodes[1]!.id).toBe("lpf1");
		});

		it("can add out nodes for outputs", () => {
			const builder = getBuilder();
			builder.addNode({ id: "saw1", device: "saw", inputs: { freq: 440 }, config: {} });
			builder.addNode({ id: "out1", device: "out", inputs: { input: { ref: "saw1", out: "audio" } }, config: {} });

			const graph = builder.build();
			expect(graph.nodes).toHaveLength(2);
			const outNode = graph.nodes.find((n) => n.device === "out");
			expect(outNode).toBeDefined();
		});
	});

	describe("global builder", () => {
		it("getBuilder returns same instance within session", () => {
			const b1 = getBuilder();
			const b2 = getBuilder();
			expect(b1).toBe(b2);
		});

		it("resetBuilder creates fresh instance", () => {
			const b1 = getBuilder();
			b1.addNode({ id: "saw1", device: "saw", inputs: {}, config: {} });

			resetBuilder();
			const b2 = getBuilder();

			expect(b2).not.toBe(b1);
			expect(b2.build().nodes).toHaveLength(0);
		});
	});
});
