/**
 * A `def: null` input left unconnected is a loud COMPILE error — never a silent
 * zero. `treq.in` is required; rooting a treq with no input must throw.
 */

import { factory, out, runProgram } from "@/core3/api";
import { beforeAll, describe, expect, it } from "vitest";
import { registerToyModules } from "./toy-modules";

beforeAll(registerToyModules);

describe("required (def:null) unconnected input", () => {
	it("errors at compile, naming the module and port", () => {
		expect(() =>
			runProgram(() => {
				const treq = factory("treq");
				out(treq()); // `in` is required and unconnected
			}),
		).toThrow(/treq\.in is required/);
	});

	it("compiles once the required input is connected", () => {
		expect(() =>
			runProgram(() => {
				const treq = factory("treq");
				const tosc = factory("tosc");
				out(tosc(220).treq());
			}),
		).not.toThrow();
	});
});
