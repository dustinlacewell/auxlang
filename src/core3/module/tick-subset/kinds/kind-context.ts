/**
 * What expression typing (type-expression.ts) needs from the function being
 * walked: its names in scope, its located error, and the type a helper call
 * returns for its argument types.
 */

import type { AnyNode } from "acorn";
import type { ValueType } from "./value-type";

/** `value`: the value is kept or used. `loose`: only its truthiness counts, or nothing. */
export type Position = "value" | "loose";

export interface KindContext {
	lookup(name: string): ValueType | undefined;
	fail(node: AnyNode, message: string): never;
	/** The return type of helper `name` for `args`; null when `name` is not a helper. */
	callHelper(name: string, args: readonly ValueType[]): ValueType | null;
}
