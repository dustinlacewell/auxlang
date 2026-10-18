/**
 * The ONE wrapper. A single Proxy over `{ node, port?, lane? }` covering all
 * fluent behavior: chaining to any registered or patch-defined module, output taps, input
 * setters (copy-with-change, setting a port's base), call = set default input,
 * and the reserved methods `out / apply / lane / id / seed / width / mod`.
 *
 * Unknown string props fail loudly listing what was available; symbols and a
 * small introspection whitelist return undefined so debuggers, JSON.stringify,
 * and promise checks never explode.
 */

import { type GroupDecl, groupDecl } from "@/engine/dsp/group-decls";
import { type NodePorts, nodePorts } from "@/engine/dsp/node-ports";
import type { GNode } from "../graph/node";
import { getRegistry } from "../dsp/define";
import { checkSeed } from "../random/check-seed";
import { currentCall } from "../source/active-source";
import { argLiteralSite } from "../source/call-bindings";
import type { ModulePorts } from "../types";
import { assertGroupPorts, type BuildGroups, bindGroup } from "./bind-group";
import { bindInput } from "./bind-input";
import { buildNode } from "./build-node";
import { connectWhole } from "./connect";
import { currentSpecs, currentSubpatches } from "./context";
import { defaultInOf } from "./default-in";
import { HANDLE, type Handle, type HandleData } from "./handle-data";
import { withModTerm } from "./mod-terms";
import { newNode } from "./new-node";
import { rootFromHandle } from "./out";
import { RESERVED_HANDLE_NAMES } from "./reserved-handle-names";
import { isPatchModule, resolvePatchModule } from "./resolve";
import { rootSubpatches } from "./subpatch/registry";

/** Introspection props that must return undefined instead of erroring. */
const INTROSPECTION = new Set([
	"toJSON",
	"then",
	"constructor",
	"inspect",
	"nodeName",
	"nodeType",
	"valueOf",
	"toString",
	"$$typeof",
	"asymmetricMatch",
]);

export function wrap(node: GNode, port?: string, lane?: number): Handle {
	const spec = resolvePatchModule(node.module);
	assertNoReservedPorts(spec);
	const ports = nodePorts(spec, node.groups);
	const data: HandleData = {
		node,
		...(port !== undefined ? { port } : {}),
		...(lane !== undefined ? { lane } : {}),
	};

	const target = () => undefined;
	return new Proxy(target, {
		get(_t, prop) {
			if (prop === HANDLE) return data;
			if (typeof prop === "symbol") return undefined;
			if (INTROSPECTION.has(prop)) return undefined;

			if (prop === "out") return () => rootFromHandle(data);
			if (prop === "apply") return <T>(fn: (h: Handle) => T): T => fn(wrap(node, port, lane));
			if (prop === "lane") return (i: number) => laneHandle(node, port, i, spec);
			if (prop === "id") return (name: string) => pinned(node, port, lane, name);
			if (prop === "seed") return (n: number) => seeded(node, port, lane, n);
			if (prop === "width") return (n: number) => withWidth(node, port, lane, n, spec);
			if (prop === "mod") {
				return (input: unknown, signal: unknown, depth: unknown = 1) =>
					modulated(node, port, lane, spec, input, signal, depth);
			}

			if (prop in ports.outs) return wrap(node, prop, lane);
			if (prop in ports.ins || groupDecl(spec, prop) !== undefined) {
				return inputSetter(node, port, lane, spec, prop);
			}
			if (isPatchModule(prop)) {
				const dest = resolvePatchModule(prop);
				return (...args: unknown[]) => wrap(buildNode(dest, args, connectWhole(data, dest)));
			}

			throw new Error(unknownPropMessage(prop, spec.name, ports));
		},

		apply(_t, _thisArg, args) {
			const defaultIn = defaultInOf(spec);
			if (args.length !== 1) {
				throw new Error(
					`${node.module}(...): calling a handle sets its default input '${defaultIn}' and takes exactly one value`,
				);
			}
			return setInput(node, port, lane, spec, defaultIn, args[0]);
		},
	}) as unknown as Handle;
}

function laneHandle(node: GNode, port: string | undefined, i: number, spec: ModulePorts): Handle {
	if (!Number.isInteger(i) || i < 0) {
		throw new Error(`${spec.name}.lane(${i}): lane must be a non-negative integer`);
	}
	return wrap(node, port, i);
}

function pinned(
	node: GNode,
	port: string | undefined,
	lane: number | undefined,
	name: string,
): Handle {
	if (typeof name !== "string" || name.length === 0) {
		throw new Error(`${node.module}.id(...): pin must be a non-empty string`);
	}
	const copy = copyNode(node);
	copy.pin = name;
	return wrap(copy, port, lane);
}

/** Value semantics: `.seed(n)` returns a COPY with its own seed (MANIFESTO §7). */
function seeded(node: GNode, port: string | undefined, lane: number | undefined, n: number): Handle {
	const copy = copyNode(node);
	copy.seed = checkSeed(n, `${node.module}.seed(n)`);
	return wrap(copy, port, lane);
}

function withWidth(
	node: GNode,
	port: string | undefined,
	lane: number | undefined,
	n: number,
	spec: ModulePorts,
): Handle {
	if (!Number.isInteger(n) || n < 1) {
		throw new Error(`${spec.name}.width(${n}): width must be a positive integer`);
	}
	const copy = copyNode(node);
	copy.config = { ...copy.config, __width: n };
	return wrap(copy, port, lane);
}

function inputSetter(
	node: GNode,
	port: string | undefined,
	lane: number | undefined,
	spec: ModulePorts,
	input: string,
): (value: unknown) => Handle {
	return (value: unknown) => setInput(node, port, lane, spec, input, value);
}

/**
 * Value semantics: setting an input returns a COPY; the original is untouched.
 * A port group name sets its members (patch/bind-group).
 */
function setInput(
	node: GNode,
	port: string | undefined,
	lane: number | undefined,
	spec: ModulePorts,
	input: string,
	value: unknown,
): Handle {
	const copy = rebound(copyNode(node), input, argLiteralSite(currentCall(), 0, value));
	const group = groupDecl(spec, input);
	if (group === undefined) copy.inputs[input] = bindInput(spec, input, value, copy.groups);
	else setGroup(copy, spec, group, value);
	return wrap(copy, port, lane);
}

function setGroup(copy: GNode, spec: ModulePorts, group: GroupDecl, value: unknown): void {
	const groups: BuildGroups = { ...copy.groups };
	bindGroup(spec, group, value, copy.inputs, groups);
	assertGroupPorts(spec, copy.inputs, groups);
	if (Object.keys(groups).length > 0) copy.groups = groups;
}

/** The node with `name`'s literal site replaced: the new literal's, or none. */
function rebound(node: GNode, name: string, site: number | undefined): GNode {
	const { bindingSites, ...rest } = node;
	const { [name]: _old, ...others } = bindingSites ?? {};
	const sites = site === undefined ? others : { ...others, [name]: site };
	return Object.keys(sites).length > 0 ? { ...rest, bindingSites: sites } : rest;
}

/** Value semantics: `.mod` returns a COPY with one more modulation term on `input`. */
function modulated(
	node: GNode,
	port: string | undefined,
	lane: number | undefined,
	spec: ModulePorts,
	input: unknown,
	signal: unknown,
	depth: unknown,
): Handle {
	const copy = copyNode(node);
	copy.mods = withModTerm(node.mods, spec, input, signal, depth, node.groups);
	return wrap(copy, port, lane);
}

/**
 * Shallow copy; `mods` records are never mutated, so they are shared. A copy
 * is a new node, so it takes the scope it is built in (patch/new-node).
 */
function copyNode(node: GNode): GNode {
	return {
		...newNode(node.module, { ...node.inputs }, { ...node.config }),
		...(node.groups !== undefined ? { groups: node.groups } : {}),
		...(node.pin !== undefined ? { pin: node.pin } : {}),
		...(node.seed !== undefined ? { seed: node.seed } : {}),
		...(node.mods !== undefined ? { mods: node.mods } : {}),
		...(node.site !== undefined ? { site: node.site } : {}),
		...(node.bindingSites !== undefined ? { bindingSites: node.bindingSites } : {}),
	};
}

/** Also enforced eagerly by defmod so a colliding port fails at the definition, not at wrap. */
export function assertNoReservedPorts(spec: ModulePorts): void {
	for (const name of Object.keys(spec.ins)) {
		if (RESERVED_HANDLE_NAMES.has(name)) throw reservedPortError(spec, name, "input");
	}
	for (const name of Object.keys(spec.outs)) {
		// The universal default output is NAMED "out" (port law) but is only
		// ever reached implicitly; any other reserved name in outs is an error.
		if (name === "out" && spec.defaultOut === "out") continue;
		if (RESERVED_HANDLE_NAMES.has(name)) throw reservedPortError(spec, name, "output");
	}
}

function reservedPortError(spec: ModulePorts, name: string, kind: string): Error {
	return new Error(
		`module '${spec.name}': ${kind} '${name}' collides with a reserved handle name ` +
			`(${[...RESERVED_HANDLE_NAMES].join(", ")})`,
	);
}

function unknownPropMessage(prop: string, moduleName: string, ports: NodePorts): string {
	const names = [
		...rootSubpatches().keys(),
		...(currentSpecs()?.keys() ?? []),
		...(currentSubpatches()?.keys() ?? []),
	];
	const defined = names.length > 0 ? ` Patch-defined modules: [${names.join(", ")}]` : "";
	return (
		`'${prop}' is not an input, output, or module for '${moduleName}'. ` +
		`inputs: [${Object.keys(ports.ins).join(", ")}], outputs: [${Object.keys(ports.outs).join(", ")}]. ` +
		`Set an input by calling it (h.${Object.keys(ports.ins)[0] ?? "input"}(x)), tap an output by name, ` +
		`or chain to a registered module. Known modules: [${[...getRegistry().keys()].join(", ")}]${defined}`
	);
}
