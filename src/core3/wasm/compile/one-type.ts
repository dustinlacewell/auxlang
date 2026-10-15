/**
 * A boolean never hides in a number. JS keeps a boolean a boolean in a
 * variable, a state field, an output or a value that may be either, and
 * `true === 1` is false; WASM would hold it as 1 in an f64, where `=== 1`
 * passes. So each place a boolean would become such a number is a loud
 * error. Where JS converts too (arithmetic, `<`, `==`, a typed-array
 * element) a boolean is 0/1 in both; in a test only truthiness counts
 * (emit-test.ts).
 */

import type { AnyNode } from "acorn";
import type { FnEmitter } from "./fn-emitter";
import type { Kind } from "./values";

const MIXED =
	"this value is a boolean on one path and a number on another — JS keeps the boolean (`true === 1` is false), WASM cannot; write `cond ? 1 : 0` for a number";

const STORED =
	"a boolean stored where a number is kept — JS keeps the boolean (`true === 1` is false), WASM cannot; write `cond ? 1 : 0` for a number, or keep the boolean in a `const`/`let` of its own";

/** Two paths of one value (`?:`, `&&`, `||`, `??`) give the same type. */
export function assertOneType(e: FnEmitter, a: Kind, b: Kind, at: AnyNode): void {
	if ((a === "bool") !== (b === "bool")) e.fail(at, MIXED);
}

/** A store of `value` into a number place that JS would leave holding a boolean. */
export function assertNotHidden(e: FnEmitter, value: Kind, place: Kind, at: AnyNode): void {
	if (value === "bool" && place !== "bool") e.fail(at, STORED);
}
