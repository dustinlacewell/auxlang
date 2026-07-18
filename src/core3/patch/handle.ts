/**
 * The ONE wrapper. A single Proxy over `{ node, port?, lane? }` covering all
 * fluent behavior: chaining to any registered module, output taps, input
 * setters (copy-with-change), call = set default input, and the reserved
 * methods `out / apply / lane / id / width`.
 *
 * Unknown string props fail loudly listing what was available; symbols and a
 * small introspection whitelist return undefined so debuggers, JSON.stringify,
 * and promise checks never explode.
 */

import type { GNode } from "../graph/node";
import { getModule, getRegistry, hasModule } from "../module/define";
import type { ModuleSpec } from "../types";
import { buildNode } from "./build-node";
import { HANDLE, type Handle, type HandleData } from "./handle-data";
import { lift, refFromHandle } from "./lift";
import { addRoot } from "./out";

/** Names the handle claims for itself; module ports may not use them. */
export const RESERVED_HANDLE_NAMES = new Set(["out", "apply", "lane", "id", "width"]);

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
	const spec = getModule(node.module);
	assertNoReservedPorts(spec);
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

			if (prop === "out") return () => addRoot(refFromHandle(data));
			if (prop === "apply") return <T>(fn: (h: Handle) => T): T => fn(wrap(node, port, lane));
			if (prop === "lane") return (i: number) => laneHandle(node, port, i, spec);
			if (prop === "id") return (name: string) => pinned(node, port, lane, name);
			if (prop === "width") return (n: number) => withWidth(node, port, lane, n, spec);

			if (prop in spec.outs) return wrap(node, prop, lane);
			if (prop in spec.ins) return inputSetter(node, port, lane, spec, prop);
			if (hasModule(prop)) {
				return (...args: unknown[]) => wrap(buildNode(getModule(prop), args, refFromHandle(data)));
			}

			throw new Error(unknownPropMessage(prop, spec));
		},

		apply(_t, _thisArg, args) {
			if (args.length !== 1) {
				throw new Error(
					`${node.module}(...): calling a handle sets its default input '${spec.defaultIn}' and takes exactly one value`,
				);
			}
			return setInput(node, port, lane, spec, spec.defaultIn, args[0]);
		},
	}) as unknown as Handle;
}

function laneHandle(node: GNode, port: string | undefined, i: number, spec: ModuleSpec): Handle {
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

function withWidth(
	node: GNode,
	port: string | undefined,
	lane: number | undefined,
	n: number,
	spec: ModuleSpec,
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
	spec: ModuleSpec,
	input: string,
): (value: unknown) => Handle {
	return (value: unknown) => setInput(node, port, lane, spec, input, value);
}

/** Value semantics: setting an input returns a COPY; the original is untouched. */
function setInput(
	node: GNode,
	port: string | undefined,
	lane: number | undefined,
	spec: ModuleSpec,
	input: string,
	value: unknown,
): Handle {
	const copy = copyNode(node);
	copy.inputs[input] = lift(value, `${spec.name}.${input}`);
	return wrap(copy, port, lane);
}

function copyNode(node: GNode): GNode {
	return {
		module: node.module,
		inputs: { ...node.inputs },
		config: { ...node.config },
		...(node.pin !== undefined ? { pin: node.pin } : {}),
	};
}

function assertNoReservedPorts(spec: ModuleSpec): void {
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

function reservedPortError(spec: ModuleSpec, name: string, kind: string): Error {
	return new Error(
		`module '${spec.name}': ${kind} '${name}' collides with a reserved handle name ` +
			`(${[...RESERVED_HANDLE_NAMES].join(", ")})`,
	);
}

function unknownPropMessage(prop: string, spec: ModuleSpec): string {
	return (
		`'${prop}' is not an input, output, or module for '${spec.name}'. ` +
		`inputs: [${Object.keys(spec.ins).join(", ")}], outputs: [${Object.keys(spec.outs).join(", ")}]. ` +
		`Set an input by calling it (h.${Object.keys(spec.ins)[0] ?? "input"}(x)), tap an output by name, ` +
		`or chain to a registered module. Known modules: [${[...getRegistry().keys()].join(", ")}]`
	);
}
