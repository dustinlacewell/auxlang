/**
 * Node construction from factory/chain arguments. Positional args fill
 * `spec.positional` in order (minus the chain-bound inputs when chaining); a
 * plain object arg carries named inputs/config. Unknown keys and excess
 * positionals fail loudly, naming what was available.
 *
 * A chain source, or a handle passed positionally into the default input, is a
 * whole-module connection: it binds by name (`connectWhole`), so a stereo
 * source fills `l` and `r` together.
 *
 * In a patch under eval the node carries the site of the call that made it,
 * and each binding from a literal argument carries that literal's site
 * (MANIFESTO §10.1).
 */

import { nodePorts } from "@/core3/module/node-ports";
import { isGNode } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import { currentCall } from "../source/active-source";
import { argLiteralSite, propLiteralSite } from "../source/call-bindings";
import type { ModulePorts } from "../types";
import { isUnitTag } from "../units/tag";
import { bindInput } from "./bind-input";
import { connectWhole } from "./connect";
import { evalCtx } from "./context";
import { handleData, isHandle } from "./handle-data";
import { newNode } from "./new-node";

export function buildNode(
	spec: ModulePorts,
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

	return { ...newNode(spec.name, inputs, config), ...sourceSites(args, positional) };
}

/** The making call's site, and the literal sites of the bindings (empty outside a located eval). */
function sourceSites(
	args: readonly unknown[],
	positional: readonly string[],
): Pick<GNode, "site" | "bindingSites"> {
	const call = currentCall();
	if (call === undefined) return {};
	const sites: Record<string, number> = {};
	const note = (name: string, site: number | undefined) => {
		if (site !== undefined) sites[name] = site;
	};
	let slot = 0;
	for (const [index, arg] of args.entries()) {
		if (!isNamedArgs(arg)) {
			note(positional[slot++]!, argLiteralSite(call, index, arg));
			continue;
		}
		for (const [key, value] of Object.entries(arg as Record<string, unknown>)) {
			note(key, propLiteralSite(call, index, key, value));
		}
	}
	return Object.keys(sites).length > 0 ? { site: call.id, bindingSites: sites } : { site: call.id };
}

/** Positional names, skipping the default input and the chain-bound inputs when chaining. */
function positionalSlots(
	spec: ModulePorts,
	chaining: boolean,
	bound: ReadonlySet<string>,
): readonly string[] {
	const names = spec.positional ?? [];
	return chaining ? names.filter((n) => n !== spec.defaultIn && !bound.has(n)) : names;
}

/** A handle into the default input is a whole-module connection; anything else assigns. */
function assignPositional(
	spec: ModulePorts,
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
	spec: ModulePorts,
	chained: Record<string, InputValue>,
	inputs: Record<string, InputValue>,
): void {
	for (const [name, value] of Object.entries(chained)) {
		if (name in inputs) throw chainBoundError(spec, name);
		inputs[name] = value;
	}
}

function chainBoundError(spec: ModulePorts, name: string): Error {
	return new Error(
		`Cannot set '${name}' when chaining into '${spec.name}' — it is already bound from the chain source`,
	);
}

function applyNamedArgs(
	spec: ModulePorts,
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
					`inputs: [${Object.keys(nodePorts(spec).ins).join(", ")}], config: [${Object.keys(spec.config ?? {}).join(", ")}]`,
			);
		}
		assign(spec, key, value, inputs, config);
	}
}

function assign(
	spec: ModulePorts,
	name: string,
	value: unknown,
	inputs: Record<string, InputValue>,
	config: Record<string, unknown>,
): void {
	if (name in nodePorts(spec).ins) {
		inputs[name] = bindInput(spec, name, value);
		return;
	}
	// Config: static per-node value. `__`-prefixed keys are compile hints
	// (e.g. __width) and always allowed.
	if (isHandle(value) || isGNode(value) || isUnitTag(value) || typeof value === "function") {
		throw new Error(`${spec.name}: config '${name}' takes a static value, not a signal`);
	}
	config[name] = value;
}

function knownKey(spec: ModulePorts, key: string): boolean {
	return key in nodePorts(spec).ins || key in (spec.config ?? {}) || key.startsWith("__");
}

/** A plain object that is not itself a signal value is a named-args bag. */
function isNamedArgs(v: unknown): boolean {
	if (typeof v !== "object" || v === null || Array.isArray(v)) return false;
	if (isHandle(v) || isGNode(v) || isUnitTag(v)) return false;
	const ast = (v as Record<string, unknown>).ast;
	if (typeof ast === "object" && ast !== null) return false; // P-like pattern
	return true;
}
