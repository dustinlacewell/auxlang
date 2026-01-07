import { beforeEach, describe, expect, it } from "vitest";

import { device } from "../descriptor/device";
import { resetIdCounter } from "../descriptor/identity";
import { inputs } from "../descriptor/inputs";
import { clearRegistry } from "../descriptor/registry";
import { out } from "./out";

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
	});

	it("accepts a descriptor directly", () => {
		const osc = device(oscSpec);
		const graph = out(osc);

		expect(graph.nodes).toHaveLength(1);
		expect(graph.outputNodeId).toBe(osc._state.id);
	});

	it("accepts an OutputRef", () => {
		const osc = device(oscSpec);
		const graph = out(osc.out);

		expect(graph.nodes).toHaveLength(1);
		expect(graph.outputNodeId).toBe(osc._state.id);
	});

	it("throws for constant signals", () => {
		expect(() => out(440)).toThrow("Cannot reify constant signal");
	});
});
