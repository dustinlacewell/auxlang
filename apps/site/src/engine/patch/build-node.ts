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

import { groupDecl } from "@/engine/dsp/group-decls";
import { nodePorts } from "@/engine/dsp/node-ports";
import { isGNode } from "../graph/input-kinds";
import type { GNode, InputValue } from "../graph/node";
import { assertGroupPorts, type BuildGroups, bindGroup, bindOpenMember } from "./bind-group";
import { currentCall } from "../source/active-source";
import { argLiteralSite, propLiteralSite } from "../source/call-bindings";
import type { ModulePorts } from "../types";
import { isUnitTag } from "../units/tag";
import { bindInput } from "./bind-input";
import { connectWhole } from "./connect";
import { evalCtx } from "./context";
import { handleData, isHandle } from "./handle-data";
import { isNamedArgs } from "./is-named-args";
import { newNode } from "./new-node";
import { rootDisplay } from "./root-display";
import { bindRecordMembers } from "./record-members";

export function buildNode(
	spec: ModulePorts,
	args: readonly unknown[],
	chained?: Record<string, InputValue>,
): GNode {
	evalCtx(`${spec.name}(...)`);
	const into: Into = { inputs: {}, config: {}, groups: {} };
	const bound = new Set(Object.keys(chained ?? {}));

	const positional = positionalSlots(spec, chained !== undefined, bound);
	let slot = 0;
	for (const arg of args) {
		if (isNamedArgs(arg)) {
			applyNamedArgs(spec, arg, into, bound);
			continue;
		}
		if (slot >= positional.length) {
			throw new Error(
				`${spec.name}: too many positional arguments (got ${args.length}). ` +
					`Positional: [${positional.join(", ")}]. Use an object for other parameters.`,
			);
		}
		assignPositional(spec, positional[slot]!, arg, into);
		slot++;
	}

	if (chained !== undefined) bindChain(spec, chained, into.inputs);
	bindRecordMembers(spec, into.config, into.inputs, into.groups);
	assertGroupPorts(spec, into.inputs, into.groups);

	const node: GNode = {
		...newNode(spec.name, into.inputs, into.config),
		...(Object.keys(into.groups).length > 0 ? { groups: into.groups } : {}),
		...sourceSites(args, positional),
	};
	rootDisplay(spec, node);
	return node;
}

/** What the arguments bind into: a node's inputs, config and port group members. */
interface Into {
	readonly inputs: Record<string, InputValue>;
	readonly config: Record<string, unknown>;
	readonly groups: BuildGroups;
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
function assignPositional(spec: ModulePorts, name: string, value: unknown, into: Into): void {
	if (name === spec.defaultIn && isHandle(value) && groupDecl(spec, name) === undefined) {
		Object.assign(into.inputs, connectWhole(handleData(value), spec));
		return;
	}
	assign(spec, name, value, into);
}

function bindChain(
	spec: ModulePorts,
	chained: Record<string, InputValue>,
	inputs: Record<string, InputValue>,
): void {
	for (const [name, value] of Object.entries(chained)) {
		if (groupDecl(spec, name) !== undefined) {
			throw new Error(
				`Cannot chain into '${spec.name}': its default input '${name}' is a port group. ` +
					`Pass the source as a member instead: ${spec.name}({ ${name}: { a: x } }).`,
			);
		}
		if (name in inputs) throw chainBoundError(spec, name);
		inputs[name] = value;
	}
}

function chainBoundError(spec: ModulePorts, name: string): Error {
	return new Error(
		`Cannot set '${name}' when chaining into '${spec.name}' — it is already bound from the chain source`,
	);
}

/** A key that names no port, group or config is a member of the open in-group, if any. */
function applyNamedArgs(
	spec: ModulePorts,
	named: Record<string, unknown>,
	into: Into,
	bound: ReadonlySet<string>,
): void {
	for (const [key, value] of Object.entries(named)) {
		if (bound.has(key)) throw chainBoundError(spec, key);
		if (knownKey(spec, key, into.groups)) assign(spec, key, value, into);
		else if (!bindOpenMember(spec, key, value, into.inputs, into.groups)) {
			throw new Error(
				`${spec.name}: unknown parameter '${key}'. ` +
					`inputs: [${Object.keys(nodePorts(spec, into.groups).ins).join(", ")}], config: [${Object.keys(spec.config ?? {}).join(", ")}]`,
			);
		}
	}
}

function assign(spec: ModulePorts, name: string, value: unknown, into: Into): void {
	const group = groupDecl(spec, name);
	if (group !== undefined) {
		bindGroup(spec, group, value, into.inputs, into.groups);
		return;
	}
	if (name in nodePorts(spec, into.groups).ins) {
		into.inputs[name] = bindInput(spec, name, value, into.groups);
		return;
	}
	// Config: static per-node value. `__`-prefixed keys are compile hints
	// (e.g. __width) and always allowed.
	if (isHandle(value) || isGNode(value) || isUnitTag(value) || typeof value === "function") {
		throw new Error(`${spec.name}: config '${name}' takes a static value, not a signal`);
	}
	into.config[name] = value;
}

function knownKey(spec: ModulePorts, key: string, groups: BuildGroups): boolean {
	return (
		groupDecl(spec, key) !== undefined ||
		key in nodePorts(spec, groups).ins ||
		key in (spec.config ?? {}) ||
		key.startsWith("__")
	);
}
