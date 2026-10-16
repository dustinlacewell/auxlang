/**
 * A port's marker: the default-value expression on a tick or setup-config
 * destructured param, read as text, never evaluated. Each shape below builds
 * the same `PortAnn` an old-form module would declare with today's helpers
 * (`sig`, `gatePort`, `optional`, `sigs`, `slotted`), so a shape-C module's
 * port surface is identical to its hand-written equivalent.
 */

import type { AnyNode } from "acorn";
import { type PortAnn, gatePort, optional, phasePort, sig, sigs, slotted, trigPort } from "../../types";

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

		if (UNIT_TAGS.has(name)) return { unit: name as PortAnn["unit"], ...tagged(arg0) };
		if (name === "unit") return { unit: "unit", ...tagged(arg0) };
		if (name === "gatePort") return merge(gatePort(numberOrNull(arg0)), arg0);
		if (name === "trigPort") return merge(trigPort(numberOrNull(arg0)), arg0);
		if (name === "phasePort") return merge(phasePort(numberOrNull(arg0)), arg0);
		if (name === "sigs") return sigs(call.arguments.length === 0 ? 0 : numberOrNull(arg0));
		if (name === "slot") return slot(call.arguments, what);
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

function slot(args: AnyNode[], what: string): PortAnn {
	const [defNode, minNode, maxNode] = args;
	if (defNode === undefined || minNode === undefined || maxNode === undefined) {
		throw new Error(`${what}: 'slot' needs a default and min/max, e.g. slot(0, "min", "max")`);
	}
	const def = numberOrNull(defNode);
	const min = slotBound(minNode, what);
	const max = slotBound(maxNode, what);
	return slotted(sig(def), { min, max });
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
			`hz/semis/secs/beats/unit(n), gatePort/trigPort/phasePort(n), sigs(n), or slot(def, "min", "max")`,
	);
}
