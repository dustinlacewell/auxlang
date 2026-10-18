/**
 * Every numeric literal in the code is a number site. A negated literal
 * (`-3`) is one site whose range includes the sign, keyed by the negation.
 */

import type { AnyNode } from "acorn";
import { walk } from "../../dsp/front/parse/walk";
import type { NumberSite } from "../source-map";
import type { SiteList } from "./site-list";

export function numberSites(program: AnyNode, list: SiteList): Map<AnyNode, NumberSite> {
	const sites = new Map<AnyNode, NumberSite>();
	const negated = new Set<AnyNode>();
	walk(program, (node) => {
		if (negated.has(node)) return;
		if (isNegatedNumber(node)) {
			negated.add(node.argument);
			sites.set(node, add(list, node, -numberOf(node.argument)));
			return;
		}
		if (isNumberLiteral(node)) sites.set(node, add(list, node, numberOf(node)));
	});
	return sites;
}

function add(list: SiteList, node: AnyNode, value: number): NumberSite {
	return list.add((id) => ({
		kind: "number",
		id,
		range: { start: node.start, end: node.end },
		value,
	}));
}

function isNegatedNumber(
	node: AnyNode,
): node is AnyNode & { type: "UnaryExpression"; argument: AnyNode } {
	return node.type === "UnaryExpression" && node.operator === "-" && isNumberLiteral(node.argument);
}

function isNumberLiteral(node: AnyNode): boolean {
	return node.type === "Literal" && typeof node.value === "number";
}

function numberOf(node: AnyNode): number {
	return (node as { value: number }).value;
}
