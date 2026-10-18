/**
 * `markerAnn` reads a port default's AST text, never evaluating it, and
 * builds the same `PortAnn` today's real helpers would (`sig`, `optional`,
 * `slotted`, ...), so a shape-C port and an old-form port agree exactly.
 */

import type { AnyNode } from "acorn";
import { parse } from "acorn";
import { describe, expect, it } from "vitest";

import { markerAnn } from "@/engine/module/lower/port-markers";
import {
	gatePort,
	group,
	optional,
	phasePort,
	sig,
	sigs,
	slotted,
	trigPort,
	unit,
} from "@/engine/types";

function defaultNode(src: string): AnyNode | null {
	if (src === "") return null;
	const program = parse(`(${src})`, { ecmaVersion: "latest" });
	const stmt = program.body[0];
	if (stmt?.type !== "ExpressionStatement") throw new Error("bad test expr");
	return stmt.expression;
}

describe("markerAnn", () => {
	it("no default -> required sig", () => {
		expect(markerAnn(defaultNode(""), "t")).toEqual(sig(null));
	});

	it("numeric literal -> sig with that default", () => {
		expect(markerAnn(defaultNode("0.5"), "t")).toEqual(sig(0.5));
	});

	it("negative numeric literal -> sig with that default", () => {
		expect(markerAnn(defaultNode("-2"), "t")).toEqual(sig(-2));
	});

	it("NaN -> optional required sig", () => {
		expect(markerAnn(defaultNode("NaN"), "t")).toEqual(optional(sig(null)));
	});

	it("hz(n) -> hz tag", () => {
		expect(markerAnn(defaultNode("hz(440)"), "t")).toEqual({ unit: "hz", def: 440 });
	});

	it("semis(n) -> semis tag", () => {
		expect(markerAnn(defaultNode("semis(69)"), "t")).toEqual({ unit: "semis", def: 69 });
	});

	it("secs(n) -> secs tag", () => {
		expect(markerAnn(defaultNode("secs(0.25)"), "t")).toEqual({ unit: "secs", def: 0.25 });
	});

	it("beats(n) -> beats tag", () => {
		expect(markerAnn(defaultNode("beats(1)"), "t")).toEqual({ unit: "beats", def: 1 });
	});

	it("unit(n) -> unit PortAnn", () => {
		expect(markerAnn(defaultNode("unit(1)"), "t")).toEqual(unit(1));
	});

	it("hz(NaN) -> optional hz tag", () => {
		expect(markerAnn(defaultNode("hz(NaN)"), "t")).toEqual({ unit: "hz", def: null, opt: true });
	});

	it("gatePort(n) -> gatePort PortAnn", () => {
		expect(markerAnn(defaultNode("gatePort(0)"), "t")).toEqual(gatePort(0));
	});

	it("trigPort(n) -> trigPort PortAnn", () => {
		expect(markerAnn(defaultNode("trigPort(0)"), "t")).toEqual(trigPort(0));
	});

	it("phasePort(n) -> phasePort PortAnn", () => {
		expect(markerAnn(defaultNode("phasePort(0)"), "t")).toEqual(phasePort(0));
	});

	it("sigs() -> closed signal group, default 0", () => {
		expect(markerAnn(defaultNode("sigs()"), "t")).toEqual(sigs());
	});

	it("sigs(n) -> closed signal group with that default", () => {
		expect(markerAnn(defaultNode("sigs(1)"), "t")).toEqual(sigs(1));
	});

	it("slot(def, 'min', 'max') -> slotted control port", () => {
		expect(markerAnn(defaultNode('slot(0, "min", "max")'), "t")).toEqual(
			slotted(sig(0), { min: "min", max: "max" }),
		);
	});

	it("slot with numeric bounds -> slotted control port", () => {
		expect(markerAnn(defaultNode("slot(0, 0, 1)"), "t")).toEqual(slotted(sig(0), { min: 0, max: 1 }));
	});

	it("slot(gatePort(n), min, max) -> slotted control port with a gate base", () => {
		expect(markerAnn(defaultNode("slot(gatePort(0), 0, 1)"), "t")).toEqual(
			slotted(gatePort(0), { min: 0, max: 1 }),
		);
	});

	it("an unrecognized default throws, naming the port", () => {
		expect(() => markerAnn(defaultNode("someCall()"), "input 'x'")).toThrow(/input 'x'/);
	});

	it("range(def, min, max) -> sig with a range", () => {
		expect(markerAnn(defaultNode("range(0.5, 0, 1)"), "t")).toEqual({
			unit: "sig",
			def: 0.5,
			range: { min: 0, max: 1 },
		});
	});

	it("a unit tag with min/max -> that unit with a range", () => {
		expect(markerAnn(defaultNode("secs(0.25, 0.01, 1)"), "t")).toEqual({
			unit: "secs",
			def: 0.25,
			range: { min: 0.01, max: 1 },
		});
	});

	it("semis(def, min, max) -> semis tag with a range", () => {
		expect(markerAnn(defaultNode("semis(84, 36, 120)"), "t")).toEqual({
			unit: "semis",
			def: 84,
			range: { min: 36, max: 120 },
		});
	});

	it("a range with 2 args throws, naming the port", () => {
		expect(() => markerAnn(defaultNode("range(0.5, 0)"), "input 'fb'")).toThrow(/input 'fb'/);
	});

	it("a range with min >= max throws", () => {
		expect(() => markerAnn(defaultNode("range(0.5, 1, 0)"), "input 'fb'")).toThrow(/input 'fb'/);
	});

	it("a range with a non-literal bound throws", () => {
		expect(() => markerAnn(defaultNode("range(0.5, 0, someCall())"), "input 'fb'")).toThrow(/input 'fb'/);
	});

	it("group(sig(0), { open: true }) -> an open signal group", () => {
		expect(markerAnn(defaultNode("group(sig(0), { open: true })"), "t")).toEqual(
			group(sig(0), { open: true }),
		);
	});

	it("group(unit(1), { like: 'ch' }) -> a group mirroring another group's members", () => {
		expect(markerAnn(defaultNode('group(unit(1), { like: "ch" })'), "t")).toEqual(
			group(unit(1), { like: "ch" }),
		);
	});

	it("group with no annotation arg throws, naming the port", () => {
		expect(() => markerAnn(defaultNode("group()"), "input 'ch'")).toThrow(/input 'ch'/);
	});

	it("group with a non-object 2nd arg throws", () => {
		expect(() => markerAnn(defaultNode("group(sig(0), 1)"), "input 'ch'")).toThrow(/input 'ch'/);
	});

	it("group with an unsupported option throws", () => {
		expect(() => markerAnn(defaultNode("group(sig(0), { foo: true })"), "input 'ch'")).toThrow(/input 'ch'/);
	});
});
