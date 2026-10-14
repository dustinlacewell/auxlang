/**
 * Node construction from factory/chain arguments. Positional args fill
 * `spec.positional` in order (minus the chain-bound inputs when chaining); a
 * plain object arg carries named inputs/config. Unknown keys and excess
 * positionals fail loudly, naming what was available.
 *
 * A chain source, or a handle passed positionally into the default input, is a
 * whole-module connection: it binds by name (`connectWhole`), so a stereo
 * source fills `l` and `r` together.
 */

import { isGNode } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import type { ModuleSpec } from "../types";
import { connectWhole } from "./connect";
import { evalCtx } from "./context";
import { handleData, isHandle } from "./handle-data";
import { lift } from "./lift";

export function buildNode(
	spec: ModuleSpec,
	args: readonly unknown[],
	chained?: Record<string, InputValue>,
): GNode {
	evalCtx(`${spec.name}(...)`);
	const inputs: Record<string, InputValue> = {};
	const config: Record<string, unknown> = {};
	const bound = new Set(Object.keys(chained ?? {}));

	const positional = positionalSlots(spec, chained !== undefined, bound);
	let slot = 0;
	for (const arg of args) {
		if (isNamedArgs(arg)) {
			applyNamedArgs(spec, arg as Record<string, unknown>, inputs, config, bound);
			continue;
		}
		if (slot >= positional.length) {
			throw new Error(
				`${spec.name}: too many positional arguments (got ${args.length}). ` +
					`Positional: [${positional.join(", ")}]. Use an object for other parameters.`,
			);
		}
		assignPositional(spec, positional[slot]!, arg, inputs, config);
		slot++;
	}

	if (chained !== undefined) bindChain(spec, chained, inputs);

	return { module: spec.name, inputs, config };
}

/** Positional names, skipping the default input and the chain-bound inputs when chaining. */
function positionalSlots(
	spec: ModuleSpec,
	chaining: boolean,
	bound: ReadonlySet<string>,
): readonly string[] {
	const names = spec.positional ?? [];
	return chaining ? names.filter((n) => n !== spec.defaultIn && !bound.has(n)) : names;
}

/** A handle into the default input is a whole-module connection; anything else assigns. */
function assignPositional(
	spec: ModuleSpec,
	name: string,
	value: unknown,
	inputs: Record<string, InputValue>,
	config: Record<string, unknown>,
): void {
	if (name === spec.defaultIn && isHandle(value)) {
		Object.assign(inputs, connectWhole(handleData(value), spec));
		return;
	}
	assign(spec, name, value, inputs, config);
}

function bindChain(
	spec: ModuleSpec,
	chained: Record<string, InputValue>,
	inputs: Record<string, InputValue>,
): void {
	for (const [name, value] of Object.entries(chained)) {
		if (name in inputs) throw chainBoundError(spec, name);
		inputs[name] = value;
	}
}

function chainBoundError(spec: ModuleSpec, name: string): Error {
	return new Error(
		`Cannot set '${name}' when chaining into '${spec.name}' — it is already bound from the chain source`,
	);
}

function applyNamedArgs(
	spec: ModuleSpec,
	named: Record<string, unknown>,
	inputs: Record<string, InputValue>,
	config: Record<string, unknown>,
	bound: ReadonlySet<string>,
): void {
	for (const [key, value] of Object.entries(named)) {
		if (bound.has(key)) throw chainBoundError(spec, key);
		if (!knownKey(spec, key)) {
			throw new Error(
				`${spec.name}: unknown parameter '${key}'. ` +
					`inputs: [${Object.keys(spec.ins).join(", ")}], config: [${Object.keys(spec.config ?? {}).join(", ")}]`,
			);
		}
		assign(spec, key, value, inputs, config);
	}
}

function assign(
	spec: ModuleSpec,
	name: string,
	value: unknown,
	inputs: Record<string, InputValue>,
	config: Record<string, unknown>,
): void {
	if (name in spec.ins) {
		inputs[name] = lift(value, `${spec.name}.${name}`);
		return;
	}
	// Config: static per-node value. `__`-prefixed keys are compile hints
	// (e.g. __width) and always allowed.
	if (isHandle(value) || isGNode(value) || typeof value === "function") {
		throw new Error(`${spec.name}: config '${name}' takes a static value, not a signal`);
	}
	config[name] = value;
}

function knownKey(spec: ModuleSpec, key: string): boolean {
	return key in spec.ins || key in (spec.config ?? {}) || key.startsWith("__");
}

/** A plain object that is not itself a signal value is a named-args bag. */
function isNamedArgs(v: unknown): boolean {
	if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
	if (isHandle(v) || isGNode(v)) return false;
	const ast = (v as Record<string, unknown>).ast;
	if (typeof ast === "object" && ast !== null) return false; // P-like pattern
	return true;
}
