/**
 * The result of a multi-wire `loop`: a record of handles. `.apply(v => ...)`
 * passes the record on, like `apply` on a handle; each wire is also readable
 * by name. Any other name is a loud error naming the wires.
 */

import type { Handle } from "./handle-data";

export type WireRecord<K extends string> = Readonly<Record<K, Handle>> & {
	apply<T>(fn: (wires: Readonly<Record<K, Handle>>) => T): T;
};

/** Names the record claims for itself; a wire may not use them. */
export const RESERVED_WIRE_NAMES: ReadonlySet<string> = new Set(["apply"]);

/** Introspection props that return undefined instead of erroring. */
const INTROSPECTION = new Set(["toJSON", "then", "constructor", "inspect", "valueOf", "toString"]);

export function wireRecord(wires: Readonly<Record<string, Handle>>): WireRecord<string> {
	const frozen = Object.freeze({ ...wires });
	const apply = <T>(fn: (w: Readonly<Record<string, Handle>>) => T): T => fn(frozen);
	return new Proxy(frozen, {
		get(_t, prop) {
			if (prop === "apply") return apply;
			if (typeof prop === "symbol" || INTROSPECTION.has(prop)) return undefined;
			if (prop in frozen) return frozen[prop];
			throw new Error(
				`loop record: '${prop}' is not a wire. Wires: [${Object.keys(frozen).join(", ")}]. Use .apply(v => ...) or read a wire by name.`,
			);
		},
	}) as unknown as WireRecord<string>;
}
