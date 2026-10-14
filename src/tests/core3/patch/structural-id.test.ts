/**
 * Structural ids are the migration keys for live re-eval: two identical runs
 * must produce identical ids (state carries across re-eval), and `.id(name)`
 * pins an explicit identity that survives structural change.
 */

import { factory, runProgram } from "@/core3/api";
import { beforeAll, describe, expect, it } from "vitest";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

const patch = () => {
	const tosc = factory("tosc");
	const tlpf = factory("tlpf");
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

	/** The last tosc in topo order: the one feeding out. */
	const oscId = (fn: () => void) => {
		const oscs = runProgram(fn).nodes.filter((n) => n.module === "tosc");
		return oscs[oscs.length - 1]!.id;
	};

	it("a differing constant keeps the id (constants are not identity)", () => {
		expect(oscId(() => factory("tosc")(330).out())).toEqual(
			oscId(() => factory("tosc")(220).out()),
		);
	});

	it("a differing lambda keeps the id (a lambda is stateless)", () => {
		expect(oscId(() => factory("tosc")(() => 330).out())).toEqual(
			oscId(() => factory("tosc")(() => 220).out()),
		);
	});

	it("different wiring produces a different id", () => {
		const constant = oscId(() => factory("tosc")(220).out());
		const wired = oscId(() => factory("tosc")(factory("tosc")(3)).out());
		expect(wired).not.toEqual(constant);
	});
});

describe(".id() pin passthrough", () => {
	it("carries the pin onto the emitted PNode", () => {
		const program = runProgram(() => {
			const tosc = factory("tosc");
			tosc(220).id("bass").out();
		});
		const osc = program.nodes.find((n) => n.module === "tosc");
		expect(osc!.pin).toBe("bass");
	});

	it("unpinned nodes carry no pin", () => {
		const program = runProgram(() => factory("tosc")(220).out());
		const osc = program.nodes.find((n) => n.module === "tosc");
		expect(osc!.pin).toBeUndefined();
	});
});
