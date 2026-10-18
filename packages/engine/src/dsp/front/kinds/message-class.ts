/**
 * What the kind check sees of a type: a boolean, a number, something else
 * known (a string, `undefined`, a bare `return;`), or unknown. Only a
 * boolean against a number is ever a conflict.
 */

import type { Ty } from "../types/ty";

export type MessageClass = "bool" | "num" | "other" | "unknown";

export function classOf(ty: Ty | null): MessageClass {
	if (ty === null) return "other";
	if (ty.k === "num" || ty.k === "bool") return ty.k;
	if (ty.k !== "static") return "unknown";
	if (typeof ty.v === "boolean") return "bool";
	return typeof ty.v === "number" ? "num" : "other";
}

export function conflict(a: Ty | null, b: Ty | null): boolean {
	const x = classOf(a);
	const y = classOf(b);
	return (x === "bool" && y === "num") || (x === "num" && y === "bool");
}
