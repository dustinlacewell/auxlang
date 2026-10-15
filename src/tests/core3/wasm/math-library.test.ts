/**
 * auxlang's own math library compiled to WASM from its JS source gives the
 * same bits as the JS library on every input tried: small, large (the
 * Payne-Hanek reduction), tiny, negative and special values.
 */

import { AUX_MATH_FUNCTIONS } from "@/core3/math/aux-math-functions";
import {
	MATH_HELPER_PREFIX,
	mathFunctionNames,
	mathHelpers,
} from "@/core3/module/bind-math/math-helpers";
import type { ArgShape } from "@/core3/wasm/compile/emit-context";
import { describe, expect, it } from "vitest";
import { exportFunctions } from "./function-module";

const names = [...AUX_MATH_FUNCTIONS.keys()];

const wasm = exportFunctions((calls) =>
	Object.fromEntries(
		names.map((name) => {
			const shapes: ArgShape[] = Array.from({ length: AUX_MATH_FUNCTIONS.get(name) ?? 1 }, () => ({
				k: "run",
				kind: "f64",
			}));
			return [name, calls.helper(MATH_HELPER_PREFIX + name, shapes)];
		}),
	),
);

const js = jsLibrary();

/** The library's helper texts, evaluated as the JS backend binds them: one constant per helper. */
function jsLibrary(): Record<string, (...args: number[]) => number> {
	const texts = mathHelpers(mathFunctionNames());
	const declarations = Object.entries(texts)
		.map(([helper, text]) => `const ${helper} = (${text});`)
		.join("\n");
	const exported = names.map((n) => `${n}: ${MATH_HELPER_PREFIX}${n}`).join(", ");
	return new Function(`${declarations}\nreturn { ${exported} };`)();
}

function inputs(): number[] {
	const xs = [
		0,
		-0,
		1,
		-1,
		0.5,
		2,
		10,
		1e-300,
		5e-324,
		1e300,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	];
	let seed = 12345;
	const next = () => {
		seed = (seed * 1103515245 + 12345) % 2147483648;
		return seed / 2147483648;
	};
	for (let k = 0; k < 400; k++) {
		const scale = [1, 10, 1e3, 1e6, 1e12, 1e22, 1e-6, 1e-12][k % 8] as number;
		xs.push((next() * 2 - 1) * scale);
	}
	return xs;
}

describe("auxlang math compiled to WASM", () => {
	const xs = inputs();
	for (const name of names) {
		it(`${name} is bit-identical to the JS library`, () => {
			const f = wasm[name] as (...a: number[]) => number;
			const g = js[name] as (...a: number[]) => number;
			const arity = AUX_MATH_FUNCTIONS.get(name) ?? 1;
			let finite = 0;
			for (let k = 0; k < xs.length; k++) {
				const x = xs[k] as number;
				const y = xs[(k * 7 + 3) % xs.length] as number;
				const args = arity === 1 ? [x] : [x, y];
				const a = f(...args);
				const b = g(...args);
				if (!Object.is(a, b)) expect(`${name}(${args.join(", ")}) = ${a}`).toBe(`${b}`);
				if (Number.isFinite(b)) finite++;
			}
			// Not a vacuous NaN-equals-NaN pass.
			expect(finite).toBeGreaterThan(20);
		});
	}
});
