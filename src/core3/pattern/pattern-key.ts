/**
 * patternKey — a pattern as text that names what its queries give: two
 * patterns with equal keys are the same AST, so they give the same events
 * for every span and seed (query.ts reads the AST and nothing else). Leaf
 * sites are left out: a site is metadata, never part of a value (ast.ts),
 * and an edit elsewhere in the code moves them. Numbers are written exactly
 * (-0, NaN and the infinities apart), object fields in sorted order. Pure.
 */

import type { Pat } from "./ast";

export function patternKey(pat: Pat): string {
	return encode(pat);
}

function encode(value: unknown): string {
	if (typeof value === "number") return Object.is(value, -0) ? "-0" : String(value);
	if (typeof value === "string") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(encode).join(",")}]`;
	if (value !== null && typeof value === "object")
		return encodeRecord(value as Record<string, unknown>);
	return String(value);
}

function encodeRecord(record: Record<string, unknown>): string {
	const fields = Object.keys(record)
		.filter((field) => field !== "site")
		.sort();
	return `{${fields.map((field) => `${JSON.stringify(field)}:${encode(record[field])}`).join(",")}}`;
}
