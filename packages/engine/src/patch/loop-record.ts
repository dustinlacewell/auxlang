/**
 * `loop(init, f)` — several fed-back wires as a record, for cross-coupled
 * systems (MANIFESTO §6.1). The init record names the wires; each gets its own
 * `z1` placeholder, so `fb.a`, `fb.b` each arrive one sample late. The body
 * returns a record with the same keys; each value feeds its wire back. The
 * result is a record handle whose `.apply` reaches the body's outputs.
 *
 * Each init value is what its wire reads before the body's first sample, and
 * again whenever the wire's source starts fresh (runtime/feedback).
 */

import type { GNode } from "../graph/node";
import { wrap } from "./handle";
import { type Handle, handleData, isHandle } from "./handle-data";
import { feedInto, feedbackPlaceholder } from "./loop-wire";
import { RESERVED_WIRE_NAMES, type WireRecord, wireRecord } from "./wire-record";

export function loopRecord(init: unknown, f: unknown): WireRecord<string> {
	const starts = wireStarts(init);
	const names = [...starts.keys()];
	if (typeof f !== "function") {
		throw new Error("loop(init, f): f must be a function of the fed-back record");
	}
	const placeholders = new Map(names.map((name) => [name, feedbackPlaceholder()]));
	const result = f(Object.freeze(handlesOf(placeholders)));
	const outputs = bodyOutputs(result, names);
	for (const [name, placeholder] of placeholders) {
		const where = `loop(init, f) wire '${name}'`;
		feedInto(placeholder, handleData(outputs[name] as Handle), where, starts.get(name));
	}
	return wireRecord(outputs);
}

/** Each wire's start value, from an init record of finite numbers. */
function wireStarts(init: unknown): Map<string, number> {
	if (typeof init !== "object" || init === null || Array.isArray(init) || isHandle(init)) {
		throw new Error("loop(init, f): init must be a record of wire names, e.g. { a: 0, b: 0 }");
	}
	const entries = Object.entries(init as Record<string, unknown>);
	if (entries.length === 0) throw new Error("loop(init, f): init names no wires");
	for (const [name, value] of entries) {
		if (RESERVED_WIRE_NAMES.has(name)) {
			throw new Error(`loop(init, f): '${name}' is reserved on the result record; rename the wire`);
		}
		if (typeof value !== "number" || !Number.isFinite(value)) {
			throw new Error(
				`loop(init, f): wire '${name}' starts at ${String(value)}. A start value is a finite number.`,
			);
		}
	}
	return new Map(entries as [string, number][]);
}

function handlesOf(placeholders: ReadonlyMap<string, GNode>): Record<string, Handle> {
	const handles: Record<string, Handle> = {};
	for (const [name, placeholder] of placeholders) handles[name] = wrap(placeholder);
	return handles;
}

/** The body's record: the same keys as init, each a handle. Anything else is loud. */
function bodyOutputs(result: unknown, names: readonly string[]): Record<string, Handle> {
	if (typeof result !== "object" || result === null || isHandle(result)) {
		throw new Error(
			`loop(init, f): f must return a record of handles with keys [${names.join(", ")}]`,
		);
	}
	const record = result as Record<string, unknown>;
	assertSameKeys(Object.keys(record), names);
	for (const name of names) {
		if (!isHandle(record[name])) {
			throw new Error(`loop(init, f): wire '${name}' must be a handle (the signal to feed back)`);
		}
	}
	return record as Record<string, Handle>;
}

function assertSameKeys(returned: readonly string[], names: readonly string[]): void {
	const same = returned.length === names.length && names.every((name) => returned.includes(name));
	if (same) return;
	throw new Error(
		`loop(init, f): f returned keys [${returned.join(", ")}], ` +
			`but init names [${names.join(", ")}]. They must be the same.`,
	);
}
