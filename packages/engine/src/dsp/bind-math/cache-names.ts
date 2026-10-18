/**
 * The names of the math call cache (cache-call.ts). Each call site keeps its
 * last arguments and last result in slots of one array, `__mc[slot]`, with
 * slots numbered across a module's tick and helpers. The array persists
 * across calls, so whoever runs the text provides it: build-tick's tick
 * factory and a lambda's wrapper declare it (`cacheArray`); WASM keeps it
 * in memory. A Float64Array keeps the doubles unboxed. An argument that must be
 * evaluated once is held in a temp `__mc<site>_x<arg>`, a plain local the
 * rewrite declares at the top of the function.
 */

import type { AnyNode } from "acorn";
import { walk } from "../front/parse/walk";

/** The cache array's name in bound text. */
export const CACHE_ARRAY = "__mc";

const RESERVED = /^__mc(?:\d|$)/;

export function slotRef(slot: number): string {
	return `${CACHE_ARRAY}[${slot}]`;
}

export function tempName(site: number, arg: number): string {
	return `${CACHE_ARRAY}${site}_x${arg}`;
}

/** The value every slot starts with: NaN, which no argument ever equals. */
export const CACHE_INIT = "NaN";

/** The declaration of a cache array with `size` slots named `name`. */
export function cacheArray(name: string, size: number): string {
	return `const ${name} = new Float64Array(${size}).fill(${CACHE_INIT});`;
}

/** The cache slots a bound function's text uses (`__mc[slot]`), ascending. */
export function cacheSlots(fn: AnyNode): number[] {
	const slots = new Set<number>();
	walk(fn, (node) => {
		const slot = cacheSlotOf(node);
		if (slot !== null) slots.add(slot);
	});
	return [...slots].sort((a, b) => a - b);
}

/** The slot of a `__mc[slot]` read or write; null for any other node. */
export function cacheSlotOf(node: AnyNode): number | null {
	if (
		node.type !== "MemberExpression" ||
		!node.computed ||
		node.object.type !== "Identifier" ||
		node.object.name !== CACHE_ARRAY ||
		node.property.type !== "Literal" ||
		typeof node.property.value !== "number"
	)
		return null;
	return node.property.value;
}

/** The size of a cache array covering every slot of `fns`: one past the highest. */
export function cacheSize(fns: readonly AnyNode[]): number {
	return fns.reduce((size, fn) => Math.max(size, ...cacheSlots(fn).map((s) => s + 1)), 0);
}

/** Throws when written source already uses a name the cache reserves. */
export function assertNoCacheNames(fn: AnyNode, what: string): void {
	walk(fn, (node) => {
		if (node.type === "Identifier" && RESERVED.test(node.name))
			throw new Error(`${what}: the name '${node.name}' is reserved for auxlang math`);
	});
}
