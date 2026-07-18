/**
 * Node construction from factory/chain arguments. Positional args fill
 * `spec.positional` in order (minus the default input when chaining); a plain
 * object arg carries named inputs/config. Unknown keys and excess positionals
 * fail loudly, naming what was available.
 */

import { isGNode } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import type { ModuleSpec } from "../types";
import { evalCtx } from "./context";
import { isHandle } from "./handle-data";
import { lift } from "./lift";

export function buildNode(
	spec: ModuleSpec,
	args: readonly unknown[],
	chainSrc?: InputValue,
): GNode {
	evalCtx(`${spec.name}(...)`);
	const inputs: Record<string, InputValue> = {};
	const config: Record<string, unknown> = {};

	const positional = positionalSlots(spec, chainSrc !== undefined);
	let slot = 0;
	for (const arg of args) {
		if (isNamedArgs(arg)) {
			applyNamedArgs(spec, arg as Record<string, unknown>, inputs, config, chainSrc !== undefined);
			continue;
		}
		if (slot >= positional.length) {
			throw new Error(
				`${spec.name}: too many positional arguments (got ${args.length}). ` +
					`Positional: [${positional.join(", ")}]. Use an object for other parameters.`,
			);
		}
		assign(spec, positional[slot]!, arg, inputs, config);
		slot++;
	}

	if (chainSrc !== undefined) {
		if (spec.defaultIn in inputs) {
			throw new Error(
				`Cannot set '${spec.defaultIn}' when chaining into '${spec.name}' — ` +
					`it is already bound from the chain source`,
			);
		}
		inputs[spec.defaultIn] = chainSrc;
	}

	return { module: spec.name, inputs, config };
}

/** Positional names, skipping the default input when it is bound by a chain. */
function positionalSlots(spec: ModuleSpec, chaining: boolean): readonly string[] {
	const names = spec.positional ?? [];
	return chaining ? names.filter((n) => n !== spec.defaultIn) : names;
}

function applyNamedArgs(
	spec: ModuleSpec,
	named: Record<string, unknown>,
	inputs: Record<string, InputValue>,
	config: Record<string, unknown>,
	chaining: boolean,
): void {
	for (const [key, value] of Object.entries(named)) {
		if (chaining && key === spec.defaultIn) {
			throw new Error(
				`Cannot set '${key}' when chaining into '${spec.name}' — it is already bound from the chain source`,
			);
		}
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
