/**
 * Pattern sites: the patterns written in the code, and a token site for every
 * mini-notation token in them. A pattern is written as
 *
 *   - a p`...` template (its splices: a number or string literal is located too),
 *   - a string literal passed to `seq` as its pattern (`seq("c3 e3")`,
 *     `x.seq("c3")`, `seq({ pattern: "c3" })`).
 *
 * A string held in a variable is not located: JS strings carry no origin.
 * Tokens come from the notation's own tokenizer, so they are the tokens the
 * parser reads. A pattern that does not tokenize gets no token sites; its
 * parse error is located at eval instead.
 */

import type { AnyNode, Literal, TaggedTemplateExpression } from "acorn";
import { walk } from "../../module/front/parse/walk";
import { tokenize } from "../../pattern/notation/tokenize";
import { patternOffset } from "../pattern-offset";
import type { NumberSite, PatternSegment, PatternSite } from "../source-map";
import { calleeName } from "./callee-name";
import { keyName } from "./key-name";
import type { SiteList } from "./site-list";

/** One pattern before it has an id: its sites' data plus the text the tokenizer reads. */
interface Written {
	readonly node: AnyNode;
	readonly segments: readonly PatternSegment[];
	readonly texts: readonly string[];
	readonly splices: readonly AnyNode[];
}

export function patternSites(
	program: AnyNode,
	numbers: ReadonlyMap<AnyNode, NumberSite>,
	list: SiteList,
): Map<AnyNode, PatternSite> {
	const sites = new Map<AnyNode, PatternSite>();
	const addPattern = (written: Written): PatternSite => {
		const splices = written.splices.map((expr) => spliceSite(expr));
		const site = list.add((id) => patternSite(id, written, splices));
		sites.set(written.node, site);
		addTokens(site, written.texts, list);
		return site;
	};
	const spliceSite = (expr: AnyNode): number | null => {
		const number = numbers.get(expr);
		if (number !== undefined) return number.id;
		return isStringLiteral(expr) ? addPattern(fromString(expr)).id : null;
	};

	walk(program, (node) => {
		if (isPTemplate(node)) addPattern(fromTemplate(node));
		for (const literal of seqPatternLiterals(node)) {
			if (!sites.has(literal)) addPattern(fromString(literal));
		}
	});
	return sites;
}

function patternSite(
	id: number,
	written: Written,
	splices: readonly (number | null)[],
): PatternSite {
	return {
		kind: "pattern",
		id,
		range: { start: written.node.start, end: written.node.end },
		segments: written.segments,
		splices,
	};
}

function addTokens(site: PatternSite, texts: readonly string[], list: SiteList): void {
	for (const token of tokensOf(texts)) {
		if (token.kind === "splice") continue;
		const start = patternOffset(site, token.pos);
		if (start === null) continue;
		list.add((id) => ({
			kind: "token",
			id,
			range: { start, end: start + token.text.length },
			pattern: site.id,
			token: token.kind,
			text: token.text,
		}));
	}
}

function tokensOf(texts: readonly string[]): ReturnType<typeof tokenize> {
	try {
		return tokenize(texts, texts.slice(1));
	} catch {
		return [];
	}
}

function fromTemplate(node: TaggedTemplateExpression): Written {
	const quasis = node.quasi.quasis;
	return {
		node,
		texts: quasis.map((q) => q.value.cooked ?? ""),
		segments: quasis.map((q) => {
			const cooked = q.value.cooked;
			const exact = cooked !== null && cooked !== undefined && cooked === q.value.raw;
			return { code: exact ? q.start : null, length: cooked?.length ?? 0 };
		}),
		splices: node.quasi.expressions,
	};
}

function fromString(node: Literal & { value: string }): Written {
	const raw = node.raw ?? "";
	const exact = raw.slice(1, -1) === node.value;
	return {
		node,
		texts: [node.value],
		segments: [{ code: exact ? node.start + 1 : null, length: node.value.length }],
		splices: [],
	};
}

function isPTemplate(node: AnyNode): node is TaggedTemplateExpression {
	return (
		node.type === "TaggedTemplateExpression" &&
		node.tag.type === "Identifier" &&
		node.tag.name === "p"
	);
}

/** The string literals a `seq` call takes as its pattern: argument 0, or `{ pattern }`. */
function seqPatternLiterals(node: AnyNode): (Literal & { value: string })[] {
	if (node.type !== "CallExpression" || calleeName(node.callee) !== "seq") return [];
	const found: (Literal & { value: string })[] = [];
	const [first] = node.arguments;
	if (first !== undefined && isStringLiteral(first)) found.push(first);
	for (const arg of node.arguments) {
		if (arg.type !== "ObjectExpression") continue;
		for (const prop of arg.properties) {
			if (prop.type !== "Property" || prop.computed) continue;
			if (keyName(prop.key) === "pattern" && isStringLiteral(prop.value)) found.push(prop.value);
		}
	}
	return found;
}

function isStringLiteral(node: AnyNode): node is Literal & { value: string } {
	return node.type === "Literal" && typeof node.value === "string";
}
