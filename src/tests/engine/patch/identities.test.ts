/**
 * Node identities for live re-eval (MANIFESTO §6.2): a node's kind and its
 * place — the path of (port, module) hops from an `out` root. Two identical
 * runs give identical identities; constants and wiring are not identity, so
 * feeding a port leaves every node's place alone. `.id(name)` pins.
 */

import { factory, runProgram } from "@/engine/api";
import type { Program } from "@/engine/types";
import { beforeAll, describe, expect, it } from "vitest";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

const patch = () => {
	const tosc = factory("tosc");
	const tlpf = factory("tlpf");
	tosc(220).tlpf(800).out();
};

/** The place of the last `module` node in program order. */
const placeOf = (program: Program, module: string) =>
	program.nodes.filter((n) => n.module === module).at(-1)?.place;

describe("identity stability", () => {
	it("two identical runs yield identical kinds and places", () => {
		const identity = (p: Program) => p.nodes.map((n) => `${n.kind}@${n.place}`);
		expect(identity(runProgram(patch))).toEqual(identity(runProgram(patch)));
	});

	it("a differing constant keeps the place", () => {
		expect(placeOf(runProgram(() => factory("tosc")(330).out()), "tosc")).toEqual(
			placeOf(runProgram(() => factory("tosc")(220).out()), "tosc"),
		);
	});

	it("feeding a port keeps the place of the node and of the nodes around it", () => {
		const plain = runProgram(() => factory("tosc")(220).tlpf(800).out());
		const fed = runProgram(() =>
			factory("tosc")(220)
				.tlpf({ cutoff: factory("tosc")(3) })
				.out(),
		);
		expect(placeOf(fed, "tlpf")).toEqual(placeOf(plain, "tlpf"));
		expect(placeOf(fed, "out")).toEqual(placeOf(plain, "out"));
		const fedOscs = fed.nodes.filter((n) => n.module === "tosc").map((n) => n.place);
		expect(fedOscs).toContain(placeOf(plain, "tosc"));
	});

	it("a module inserted above a node moves only the nodes above it", () => {
		const plain = runProgram(() => factory("tosc")(220).tlpf(800).out());
		const inserted = runProgram(() => factory("tosc")(220).treq().tlpf(800).out());
		expect(placeOf(inserted, "tlpf")).toEqual(placeOf(plain, "tlpf"));
		expect(placeOf(inserted, "tosc")).not.toEqual(placeOf(plain, "tosc"));
	});

	it("two nodes of one kind at different places get different places", () => {
		const program = runProgram(() => {
			const tosc = factory("tosc");
			tosc(tosc(3)).out();
		});
		const [inner, outer] = program.nodes.filter((n) => n.module === "tosc");
		expect(inner?.kind).toBe(outer?.kind);
		expect(inner?.place).not.toEqual(outer?.place);
	});
});

describe(".id() pin passthrough", () => {
	it("carries the pin onto the emitted PNode", () => {
		const program = runProgram(() => {
			const tosc = factory("tosc");
			tosc(220).id("bass").out();
		});
		const osc = program.nodes.find((n) => n.module === "tosc");
		expect(osc?.pin).toBe("bass");
	});

	it("unpinned nodes carry no pin", () => {
		const program = runProgram(() => factory("tosc")(220).out());
		const osc = program.nodes.find((n) => n.module === "tosc");
		expect(osc).toBeDefined();
		expect(osc?.pin).toBeUndefined();
	});
});
