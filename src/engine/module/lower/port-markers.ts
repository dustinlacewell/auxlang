/**
 * A port's marker: the default-value expression on a tick or setup-config
 * destructured param, read as text, never evaluated. Each shape below builds
 * the same `PortAnn` an old-form module would declare with today's helpers
 * (`sig`, `gatePort`, `optional`, `sigs`, `slotted`), so a shape-C module's
 * port surface is identical to its hand-written equivalent.
 */

import type { AnyNode } from "acorn";
import { type PortAnn, type PortGroup, gatePort, group, optional, phasePort, sig, sigs, slotted, trigPort } from "../../types";

const UNIT_TAGS = new Set(["hz", "semis", "secs", "beats"]);

/** `markerAnn(node, what)` — `node` is a default's AST expression; `what` names the port for errors. */
export function markerAnn(node: AnyNode | null, what: string): PortAnn {
	if (node === null) return sig(null);
	if (isNaNLiteral(node)) return optional(sig(null));

	if (node.type === "Literal" && typeof (node as { value: unknown }).value === "number") {
		return sig((node as { value: number }).value);
	}
	if (node.type === "UnaryExpression" && (node as { operator: string }).operator === "-") {
		const arg = (node as { argument: AnyNode }).argument;
		if (arg.type === "Literal" && typeof (arg as { value: unknown }).value === "number") {
			return sig(-((arg as { value: number }).value));
		}
	}

	if (node.type === "CallExpression") {
		const call = node as unknown as { callee: AnyNode; arguments: AnyNode[] };
		if (call.callee.type !== "Identifier") return fail(what, node);
		const name = (call.callee as { name: string }).name;
		const arg0 = call.arguments[0] ?? null;

		if (UNIT_TAGS.has(name)) return withRange({ unit: name as PortAnn["unit"], ...tagged(arg0) }, call.arguments, what);
		if (name === "sig") return withRange({ unit: "sig", ...tagged(arg0) }, call.arguments, what);
		if (name === "unit") return withRange({ unit: "unit", ...tagged(arg0) }, call.arguments, what);
		if (name === "gatePort") return merge(gatePort(numberOrNull(arg0)), arg0);
		if (name === "trigPort") return merge(trigPort(numberOrNull(arg0)), arg0);
		if (name === "phasePort") return merge(phasePort(numberOrNull(arg0)), arg0);
		if (name === "sigs") return sigs(call.arguments.length === 0 ? 0 : numberOrNull(arg0));
		if (name === "slot") return slot(call.arguments, what);
		if (name === "range") return withRange({ unit: "sig", ...tagged(arg0) }, call.arguments, what);
		if (name === "group") return groupAnn(call.arguments, what);
	}

	return fail(what, node);
}

function tagged(arg0: AnyNode | null): { def: number | null; opt?: true } {
	if (arg0 !== null && isNaNLiteral(arg0)) return { def: null, opt: true };
	return { def: numberOrNull(arg0) };
}

function merge(ann: PortAnn, arg0: AnyNode | null): PortAnn {
	if (arg0 !== null && isNaNLiteral(arg0)) return optional({ ...ann, def: null });
	return ann;
}

/** A unit tag or `range(...)` with a 2nd/3rd arg sets the port's range: `def, min, max`. */
function withRange(ann: PortAnn, args: AnyNode[], what: string): PortAnn {
	if (args.length === 1) return ann;
	if (args.length !== 3) {
		throw new Error(`${what}: a range needs a default and min/max, e.g. '${ann.unit}(0.5, 0, 1)'`);
	}
	const [, minNode, maxNode] = args;
	const min = rangeBound(minNode, what);
	const max = rangeBound(maxNode, what);
	if (min >= max) throw new Error(`${what}: range min (${min}) must be less than max (${max})`);
	return { ...ann, range: { min, max } };
}

function rangeBound(node: AnyNode | undefined, what: string): number {
	const value = node === undefined ? null : numberOrNull(node);
	if (value === null) throw new Error(`${what}: range bounds must be number literals`);
	return value;
}

/** `group(ann, { open, like })` — `ann` is a nested marker expression; the 2nd arg (optional) is an
 *  object literal naming the group's `open`/`like` options, same meaning as today's `group()` helper. */
function groupAnn(args: AnyNode[], what: string): PortAnn {
	const [annNode, optsNode] = args;
	if (annNode === undefined) {
		throw new Error(`${what}: 'group' needs an annotation, e.g. group(sig(0), { open: true })`);
	}
	const ann = markerAnn(annNode, what);
	const opts = optsNode === undefined ? {} : groupOpts(optsNode, what);
	return group(ann, opts);
}

function groupOpts(node: AnyNode, what: string): PortGroup {
	if (node.type !== "ObjectExpression") {
		throw new Error(`${what}: 'group's 2nd arg must be an object literal, e.g. { open: true } or { like: "ch" }`);
	}
	const opts: { open?: true; like?: string } = {};
	for (const prop of (node as unknown as { properties: AnyNode[] }).properties) {
		if (prop.type !== "Property" || prop.key.type !== "Identifier") {
			throw new Error(`${what}: 'group's options must be plain keys, e.g. { open: true }`);
		}
		const key = prop.key.name as string;
		const value = (prop as unknown as { value: AnyNode }).value;
		if (key === "open") {
			if (value.type !== "Literal" || (value as { value: unknown }).value !== true) {
				throw new Error(`${what}: 'group's 'open' option must be 'true'`);
			}
			opts.open = true;
			continue;
		}
		if (key === "like") {
			if (value.type !== "Literal" || typeof (value as { value: unknown }).value !== "string") {
				throw new Error(`${what}: 'group's 'like' option must be a string naming another group`);
			}
			opts.like = (value as { value: string }).value;
			continue;
		}
		throw new Error(`${what}: 'group' does not support option '${key}'; use 'open' or 'like'`);
	}
	return opts;
}

function slot(args: AnyNode[], what: string): PortAnn {
	const [defNode, minNode, maxNode] = args;
	if (defNode === undefined || minNode === undefined || maxNode === undefined) {
		throw new Error(`${what}: 'slot' needs a default and min/max, e.g. slot(0, "min", "max")`);
	}
	const min = slotBound(minNode, what);
	const max = slotBound(maxNode, what);
	return slotted(slotBase(defNode, what), { min, max });
}

/** `slot`'s own default, or a nested `gatePort(n)`/`trigPort(n)` picking the base port's unit. */
function slotBase(defNode: AnyNode, what: string): PortAnn {
	if (defNode.type === "CallExpression") {
		const call = defNode as unknown as { callee: AnyNode; arguments: AnyNode[] };
		if (call.callee.type === "Identifier") {
			const name = (call.callee as { name: string }).name;
			const arg0 = call.arguments[0] ?? null;
			if (name === "gatePort") return gatePort(numberOrNull(arg0));
			if (name === "trigPort") return trigPort(numberOrNull(arg0));
		}
	}
	return sig(numberOrNull(defNode));
}

function slotBound(node: AnyNode, what: string): string | number {
	if (node.type === "Literal") {
		const value = (node as { value: unknown }).value;
		if (typeof value === "string" || typeof value === "number") return value;
	}
	throw new Error(`${what}: 'slot' bounds must be a string port name or a number literal`);
}

function numberOrNull(node: AnyNode | null): number | null {
	if (node === null) return null;
	if (node.type === "Literal" && typeof (node as { value: unknown }).value === "number") {
		return (node as { value: number }).value;
	}
	if (node.type === "UnaryExpression" && (node as { operator: string }).operator === "-") {
		const arg = (node as { argument: AnyNode }).argument;
		if (arg.type === "Literal" && typeof (arg as { value: unknown }).value === "number") {
			return -((arg as { value: number }).value);
		}
	}
	return null;
}

function isNaNLiteral(node: AnyNode): boolean {
	return node.type === "Identifier" && (node as { name: string }).name === "NaN";
}

function fail(what: string, node: AnyNode): never {
	throw new Error(
		`${what}: unrecognized port default '${(node as { type: string }).type}'; use a number, NaN, ` +
			`hz/semis/secs/beats/unit(n), gatePort/trigPort/phasePort(n), sigs(n), slot(def, "min", "max"), ` +
			`or group(ann, { open, like })`,
	);
}
