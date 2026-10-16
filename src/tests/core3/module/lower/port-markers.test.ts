/**
 * `markerAnn` reads a port default's AST text, never evaluating it, and
 * builds the same `PortAnn` today's real helpers would (`sig`, `optional`,
 * `slotted`, ...), so a shape-C port and an old-form port agree exactly.
 */

import type { AnyNode } from "acorn";
import { parse } from "acorn";
import { describe, expect, it } from "vitest";

import { markerAnn } from "@/core3/module/lower/port-markers";
import {
	gatePort,
	optional,
	phasePort,
	sig,
	sigs,
	slotted,
	trigPort,
	unit,
} from "@/core3/types";

function defaultNode(src: string): AnyNode | null {
	if (src === "") return null;
	const program = parse(`(${src})`, { ecmaVersion: "latest" });
	const stmt = program.body[0];
	if (stmt.type !== "ExpressionStatement") throw new Error("bad test expr");
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

	it("an unrecognized default throws, naming the port", () => {
		expect(() => markerAnn(defaultNode("someCall()"), "input 'x'")).toThrow(/input 'x'/);
	});
});
