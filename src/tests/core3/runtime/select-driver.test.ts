/**
 * Driver selection and the codegen fallback: a host that forbids
 * `new Function` (EvalError under CSP) falls back to the interpreter with a
 * loud log; any other compile error is a generator bug and propagates. Also
 * pins the numeric literal spellings the generator bakes.
 */

import { numLiteral } from "@/core3/runtime/codegen/js-literal";
import type { Driver, DriverOptions, DriverPlan } from "@/core3/runtime/driver";
import { selectDriver } from "@/core3/runtime/select-driver";
import { afterEach, describe, expect, it, vi } from "vitest";

const noPlan: DriverPlan = { runs: [], tapsL: new Int32Array(0), tapsR: new Int32Array(0) };

afterEach(() => vi.restoreAllMocks());

describe("selectDriver", () => {
	it("codegen off never calls the compiler", () => {
		const compile = vi.fn<(plan: DriverPlan, options: DriverOptions) => Driver>();
		selectDriver(noPlan, { codegen: false }, compile);
		expect(compile).not.toHaveBeenCalled();
	});

	it("codegen on returns the compiled driver, passing the options through", () => {
		const driver: Driver = () => {};
		const compile = vi.fn((_plan: DriverPlan, _options: DriverOptions) => driver);
		expect(selectDriver(noPlan, { codegen: true }, compile)).toBe(driver);
		selectDriver(noPlan, { codegen: true, paste: true }, compile);
		expect(compile.mock.calls.map((c) => c[1].paste)).toEqual([undefined, true]);
	});

	it("both generated forms compile an empty program", () => {
		const out = new Float32Array(4);
		for (const paste of [false, true]) {
			const driver = selectDriver(noPlan, { codegen: true, paste });
			const bufs = { cur: new Float64Array(0), prv: new Float64Array(0) };
			driver(bufs, out, out, 0, 4, 0, 48000);
			expect([...out]).toEqual([0, 0, 0, 0]);
		}
	});

	it("an EvalError (CSP) falls back to the interpreter and logs", () => {
		const log = vi.spyOn(console, "error").mockImplementation(() => {});
		const blocked = () => {
			throw new EvalError("Refused to evaluate a string as JavaScript");
		};
		const driver = selectDriver(noPlan, { codegen: true }, blocked);
		expect(typeof driver).toBe("function");
		expect(log).toHaveBeenCalledOnce();
		expect(String(log.mock.calls[0]?.[0])).toContain("falling back to the interpreter");
	});

	it("any other compile error propagates", () => {
		const broken = () => {
			throw new SyntaxError("generator bug");
		};
		expect(() => selectDriver(noPlan, { codegen: true }, broken)).toThrow("generator bug");
	});
});

describe("numLiteral", () => {
	it("round-trips every double, including -0, NaN, and infinities", () => {
		const edges = [
			0,
			-0,
			0.1,
			1 / 3,
			-1e-300,
			5e-324,
			Number.NaN,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		];
		for (const v of edges) {
			expect(Object.is(new Function(`return ${numLiteral(v)};`)(), v)).toBe(true);
		}
	});

	it("refuses a non-number", () => {
		expect(() => numLiteral("1")).toThrow("numeric constant");
	});
});
