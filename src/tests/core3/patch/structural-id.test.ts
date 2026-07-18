/**
 * Structural ids are the migration keys for live re-eval: two identical runs
 * must produce identical ids (state carries across re-eval), and `.id(name)`
 * pins an explicit identity that survives structural change.
 */

import { mod, runProgram } from "@/core3/api";
import { beforeAll, describe, expect, it } from "vitest";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

const patch = () => {
	const tosc = mod("tosc");
	const tlpf = mod("tlpf");
	tosc(220).tlpf(800).out();
};

describe("structural id stability", () => {
	it("two identical runEval calls yield identical node ids", () => {
		const a = runProgram(patch);
		const b = runProgram(patch);

		const idsA = a.nodes.map((n) => `${n.module}:${n.id}`);
		const idsB = b.nodes.map((n) => `${n.module}:${n.id}`);
		expect(idsB).toEqual(idsA);
	});

	it("differing config produces a different id", () => {
		const a = runProgram(() => mod("tosc")(220).out());
		const b = runProgram(() => mod("tosc")(330).out());
		const idA = a.nodes.find((n) => n.module === "tosc")!.id;
		const idB = b.nodes.find((n) => n.module === "tosc")!.id;
		expect(idB).not.toEqual(idA);
	});
});

describe(".id() pin passthrough", () => {
	it("carries the pin onto the emitted PNode", () => {
		const program = runProgram(() => {
			const tosc = mod("tosc");
			tosc(220).id("bass").out();
		});
		const osc = program.nodes.find((n) => n.module === "tosc");
		expect(osc!.pin).toBe("bass");
	});

	it("unpinned nodes carry no pin", () => {
		const program = runProgram(() => mod("tosc")(220).out());
		const osc = program.nodes.find((n) => n.module === "tosc");
		expect(osc!.pin).toBeUndefined();
	});
});
