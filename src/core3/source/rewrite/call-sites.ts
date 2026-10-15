/**
 * Call sites: every call and tagged template the rewrite traces. Three kinds
 * of call are left alone:
 *
 *   - calls inside a protected span (protected-spans.ts), whose text must not change;
 *   - `Math.*` calls, which never build a module;
 *   - calls on an optional chain's spine (`a?.b().c()`): wrapping one would
 *     break the chain's short-circuit.
 *
 * Each site records the literals written in its argument list, so a port
 * bound from one can carry the literal's site.
 */

import type { AnyNode, CallExpression, TaggedTemplateExpression } from "acorn";
import { walk } from "../../module/tick-subset/walk";
import type { SourceRange } from "../range";
import type { ArgLiteral, ArgSite, CallSite, NumberSite, PatternSite } from "../source-map";
import { calleeName, calleeStart } from "./callee-name";
import { isMathMember } from "./is-math-member";
import { keyName } from "./key-name";
import type { SiteList } from "./site-list";

type Traced = CallExpression | TaggedTemplateExpression;

/** The literal sites an argument may name. */
export interface LiteralSites {
	readonly numbers: ReadonlyMap<AnyNode, NumberSite>;
	readonly patterns: ReadonlyMap<AnyNode, PatternSite>;
}

/** A traced call: its site, and the code span the trace wraps. */
export interface TracedCall {
	readonly site: CallSite;
	readonly span: SourceRange;
}

export function callSites(
	program: AnyNode,
	protectedSpans: readonly SourceRange[],
	literals: LiteralSites,
	list: SiteList,
): TracedCall[] {
	const spine = chainSpines(program);
	const calls: TracedCall[] = [];
	walk(program, (node) => {
		if (!isTraced(node) || spine.has(node) || isMathCall(node)) return;
		if (protectedSpans.some((span) => node.start >= span.start && node.end <= span.end)) return;
		const site = list.add((id) => callSite(id, node, literals));
		calls.push({ site, span: { start: node.start, end: node.end } });
	});
	return calls;
}

function callSite(id: number, node: Traced, literals: LiteralSites): CallSite {
	const callee = node.type === "CallExpression" ? node.callee : node.tag;
	const pattern = literals.patterns.get(node);
	return {
		kind: "call",
		id,
		range: { start: calleeStart(callee), end: node.end },
		callee: calleeName(callee),
		args: node.type === "CallExpression" ? argSites(node.arguments, literals) : [],
		...(pattern !== undefined ? { pattern: pattern.id } : {}),
	};
}

/** Per argument; a spread ends the list, since later arguments no longer line up. */
function argSites(args: readonly AnyNode[], literals: LiteralSites): ArgSite[] {
	const sites: ArgSite[] = [];
	for (const arg of args) {
		if (arg.type === "SpreadElement") break;
		sites.push(literalOf(arg, literals) ?? propsOf(arg, literals));
	}
	return sites;
}

function propsOf(arg: AnyNode, literals: LiteralSites): ArgSite {
	if (arg.type !== "ObjectExpression") return null;
	const props: Record<string, ArgLiteral> = {};
	for (const prop of arg.properties) {
		if (prop.type !== "Property" || prop.computed) continue;
		const key = keyName(prop.key);
		const literal = literalOf(prop.value, literals);
		if (key !== null && literal !== null) props[key] = literal;
	}
	return Object.keys(props).length > 0 ? { props } : null;
}

function literalOf(node: AnyNode, literals: LiteralSites): ArgLiteral | null {
	const number = literals.numbers.get(node);
	if (number !== undefined) return { site: number.id, value: number.value };
	const pattern = literals.patterns.get(node);
	if (pattern !== undefined && node.type === "Literal" && typeof node.value === "string") {
		return { site: pattern.id, value: node.value };
	}
	return null;
}

function isTraced(node: AnyNode): node is Traced {
	return node.type === "CallExpression" || node.type === "TaggedTemplateExpression";
}

function isMathCall(node: Traced): boolean {
	return node.type === "CallExpression" && isMathMember(node.callee);
}

/** The calls along each optional chain's callee/object spine. */
function chainSpines(program: AnyNode): Set<AnyNode> {
	const spine = new Set<AnyNode>();
	walk(program, (node) => {
		if (node.type !== "ChainExpression") return;
		let at: AnyNode = node.expression;
		while (at.type === "CallExpression" || at.type === "MemberExpression") {
			if (at.type === "CallExpression") {
				spine.add(at);
				at = at.callee;
			} else {
				at = at.object;
			}
		}
	});
	return spine;
}
