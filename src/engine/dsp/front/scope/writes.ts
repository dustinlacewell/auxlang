/**
 * Where each binding is written: the assignments (`x = …`, `x += …`) and
 * updates (`x++`) whose target is a name that resolves to it. A declaration's
 * initial value is not a write. Writes through a binding (`x[k] = …`) write
 * the value it holds, not the binding, and are not listed.
 */

import type { AnyNode, AssignmentExpression, UpdateExpression } from "acorn";
import type { FunctionNode } from "@/engine/dsp/front/parse/parse-function";
import { walk } from "@/engine/dsp/front/parse/walk";
import { type Binding, type Scopes, bindingOf } from "./binding";

export type WriteSite = AssignmentExpression | UpdateExpression;

export type WriteSites = ReadonlyMap<Binding, readonly WriteSite[]>;

export function writeSites(fn: FunctionNode, scopes: Scopes): WriteSites {
	const sites = new Map<Binding, WriteSite[]>();
	walk(fn.body, (node) => {
		const target = targetOf(node);
		if (target?.type !== "Identifier") return;
		const binding = bindingOf(scopes, target);
		if (binding === undefined) return;
		const list = sites.get(binding) ?? [];
		list.push(node as WriteSite);
		sites.set(binding, list);
	});
	return sites;
}

/** Whether `binding` is written anywhere. */
export function isWritten(sites: WriteSites, binding: Binding): boolean {
	return (sites.get(binding) ?? []).length > 0;
}

/** Whether `binding` is written anywhere inside `node`. */
export function writtenWithin(sites: WriteSites, binding: Binding, node: AnyNode): boolean {
	return (sites.get(binding) ?? []).some((w) => w.start >= node.start && w.end <= node.end);
}

function targetOf(node: AnyNode): AnyNode | null {
	if (node.type === "AssignmentExpression") return node.left;
	if (node.type === "UpdateExpression") return node.argument;
	return null;
}
