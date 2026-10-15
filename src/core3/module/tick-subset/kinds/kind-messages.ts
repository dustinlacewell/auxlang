/**
 * The kind check's loud errors. Each names a place where JS would keep a
 * boolean that a backend holding numbers in f64 slots cannot tell from 0/1
 * (`true === 1` is false in JS).
 */

export const STORED =
	"a boolean stored where a number is kept — JS keeps the boolean (`true === 1` is false); write `cond ? 1 : 0` for a number, or keep the boolean in a `const`/`let` of its own";

export const INTO_BOOLEAN =
	"a number stored in a boolean variable — a variable keeps the type it starts with; start it as a number (`let x = 0`)";

export const MIXED =
	"this value is a boolean on one path and a number on another — write `cond ? 1 : 0` for a number";

export const MIXED_RETURNS = "it returns booleans and numbers — return `cond ? 1 : 0` for a number";

export const LAMBDA_BOOLEAN =
	"a lambda must return a number, not a boolean — return `cond ? 1 : 0`";

export const STEP_BOOLEAN = "++/-- need a number variable, not a boolean";
