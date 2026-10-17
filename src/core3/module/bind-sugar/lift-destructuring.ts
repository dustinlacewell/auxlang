/**
 * Lift destructuring (MANIFESTO §5, card step 4) to the plain declarations
 * and member reads the tick subset already accepts: `const { a, b: bb, c = 1
 * } = rec` → `const a = rec.a, bb = rec.b, c = rec.c === undefined ? 1 :
 * rec.c`; `const [x, y] = arr` → `const x = arr[0], y = arr[1]`. A record
 * field always exists in this language's fixed shape, so a default only
 * fires when the read is `undefined` — the same rule an array's
 * out-of-range read already gives on both engines. The right side is read
 * once: a plain identifier or member path is read in place (safe to repeat),
 * anything else is hoisted into a `__sg_` const declared right before the
 * declaration, same as a non-path `for...of` iterable (lift-for-of.ts).
 * Nested patterns (`{ p: { q } }`) recurse the same way, reading through the
 * outer pattern's own source path.
 *
 * A rest element (`...r`) allocates and is a loud error naming the fix.
 *
 * A helper's destructured params (`function f({ a, b }, [x, y]) { ... }`)
 * become plain `__sg_pN` params, with the same declarations inserted at the
 * top of the body.
 *
 * A `for (const { a, b } of recs)` head loses its pattern here (the element
 * becomes a plain `__sg_` local with the declarations placed at the top of
 * the loop body), so lift-for-of, which runs after this lift, sees a plain
 * identifier head and lifts it like any other loop.
 *
 * Destructuring ASSIGNMENT (`[a, b] = [b, a]`, no `const`/`let`) allocates an
 * array literal to carry the swap, so only the two-element swap idiom is
 * lifted, to a temp-held exchange with no allocation; any other
 * destructuring assignment is a loud error naming the exception.
 */

import type {
	AnyNode,
	ArrayPattern,
	AssignmentExpression,
	AssignmentProperty,
	ForOfStatement,
	ObjectPattern,
	Pattern,
	VariableDeclaration,
	VariableDeclarator,
} from "acorn";
import type { FunctionNode } from "../front/parse/parse-function";
import { parseFunction } from "../front/parse/parse-function";
import { eachChild } from "../front/parse/walk";
import { arrowEnd, tempName } from "./sugar-temps";

interface TextEdit {
	readonly start: number;
	readonly end: number;
	readonly text: string;
}

/** Counters for this lift's generated names, one fresh set per `liftDestructuring` call; `swapTemps` collects each swap's numeric temp so they can be declared once at the top of the function, same as lift-exponent-assign.ts's index temps (sugar-temps.ts). */
interface Sites {
	forOf: number;
	hoist: number;
	swap: number;
	readonly swapTemps: string[];
}

export function liftDestructuring(src: string, what: string): string {
	const parsed = parseFunction(src, what);
	const site: Sites = { forOf: 0, hoist: 0, swap: 0, swapTemps: [] };
	const lowered = transformFunction(parsed.node, parsed.expression, site, what);
	return lowered === parsed.expression.slice(parsed.node.start, parsed.node.end)
		? src
		: src.slice(0, parsed.node.start - parsed.offset) +
				lowered +
				src.slice(parsed.node.end - parsed.offset);
}

/**
 * The whole function's text, built in three independent pieces: the head
 * (params through the arrow or the opening paren, with any destructured
 * param rewritten to a plain `__sg_pN` name), the already-lowered body, and
 * whatever followed the body as written (a parenthesised expression body's
 * own closing `)`). When destructured params or a swap need declarations
 * at the top of the body, the head is instead cut at the arrow's own `=>`
 * (discarding a leading body-paren, if there was one) and the body
 * rebuilt as its own self-closing block — same shape declareTemps
 * (sugar-temps.ts) builds — so the piece that follows the original body is
 * never needed.
 */
function transformFunction(fn: FunctionNode, text: string, site: Sites, what: string): string {
	const paramEdits: TextEdit[] = [];
	const paramDecls: string[] = [];
	fn.params.forEach((param, k) => {
		if (param.type === "Identifier") return;
		const name = tempName("p", k);
		paramEdits.push({ start: param.start, end: param.end, text: name });
		paramDecls.push(`let ${declarationsFor(param as Pattern, name, text, what)};`);
	});
	const loweredBody = transformBody(fn.body as AnyNode, text, site, what);
	const swapDecls = site.swapTemps.length === 0 ? [] : [`let ${site.swapTemps.map((t) => `${t} = 0`).join(", ")};`];
	const decls = [...swapDecls, ...paramDecls].join(" ");
	if (decls === "") {
		const head = applyEdits(
			text.slice(fn.start, fn.body.start),
			paramEdits.map((e) => ({ ...e, start: e.start - fn.start, end: e.end - fn.start })),
		);
		return head + loweredBody + text.slice(fn.body.end, fn.end);
	}
	const headEnd = fn.body.type === "BlockStatement" ? fn.body.start : arrowEnd(text, fn.start, fn.body.start);
	const head = applyEdits(
		text.slice(fn.start, headEnd),
		paramEdits.map((e) => ({ ...e, start: e.start - fn.start, end: e.end - fn.start })),
	);
	if (fn.body.type === "BlockStatement") return `${head}{ ${decls}${loweredBody.slice(1)}`;
	return `${head} { ${decls} return (${loweredBody}); }`;
}

/** `node`'s own text, with every destructuring declaration, destructuring-assignment swap, and for...of pattern head within it lowered (innermost first, via the recursive walk). */
function transformBody(node: AnyNode, text: string, site: Sites, what: string): string {
	const edits: TextEdit[] = [];
	eachChild(node, function visit(child) {
		if (child.type === "VariableDeclaration" && hasPattern(child))
			edits.push(declarationEdit(child, text, site, what));
		else if (child.type === "ForOfStatement" && hasForOfPattern(child))
			edits.push(forOfEdit(child, text, site, what));
		else if (child.type === "AssignmentExpression" && isPatternAssignment(child))
			edits.push(swapEdit(child, text, site, what));
		else eachChild(child, visit);
	});
	if (edits.length === 0) return text.slice(node.start, node.end);
	return applyEditsWithin(node, edits, text);
}

function hasPattern(decl: VariableDeclaration): boolean {
	return decl.declarations.some((d) => d.id.type !== "Identifier");
}

function hasForOfPattern(node: ForOfStatement): boolean {
	if (node.left.type !== "VariableDeclaration") return false;
	const declarator = node.left.declarations[0];
	return declarator !== undefined && declarator.id.type !== "Identifier";
}

function applyEditsWithin(node: AnyNode, edits: readonly TextEdit[], text: string): string {
	const sorted = [...edits].sort((a, b) => b.start - a.start);
	let out = text.slice(node.start, node.end);
	const base = node.start;
	for (const e of sorted) out = out.slice(0, e.start - base) + e.text + out.slice(e.end - base);
	return out;
}

function applyEdits(text: string, edits: readonly TextEdit[]): string {
	const sorted = [...edits].sort((a, b) => b.start - a.start);
	let out = text;
	for (const e of sorted) out = out.slice(0, e.start) + e.text + out.slice(e.end);
	return out;
}

/** `const { a, b } = rec` (one or more declarators, each possibly plain): one `const`/`let` statement per declarator that needs a hoist (keeping each hoist its own statement, evaluated in the author's order), then the declaration itself with every pattern reading its already-settled source. */
function declarationEdit(decl: VariableDeclaration, text: string, site: Sites, what: string): TextEdit {
	const hoists: string[] = [];
	const parts: string[] = [];
	for (const d of decl.declarations) {
		const { hoist, text: part } = declaratorText(d, text, site, what);
		if (hoist !== null) hoists.push(hoist);
		parts.push(part);
	}
	return { start: decl.start, end: decl.end, text: `${hoists.join(" ")}${decl.kind} ${parts.join(", ")};` };
}

/** One declarator: a plain name keeps its own `name = init`; a pattern reads its source once (hoisting a non-path init into its own `const` statement right before). */
function declaratorText(
	d: VariableDeclarator,
	text: string,
	site: Sites,
	what: string,
): { readonly hoist: string | null; readonly text: string } {
	if (d.id.type === "Identifier") {
		const init = d.init === null || d.init === undefined ? "" : ` = ${sliceOf(d.init, text)}`;
		return { hoist: null, text: `${d.id.name}${init}` };
	}
	if (d.init === null || d.init === undefined)
		throw new Error(`${what}: a destructuring declaration needs an initial value`);
	const source = sourceOf(d.init, text, site);
	return { hoist: source.hoist, text: declarationsFor(d.id as Pattern, source.expr, text, what) };
}

/** A plain identifier or member path reads in place (no hoist statement); anything else is hoisted into its own `const` statement, read once, so its name can be read in place as often as the pattern needs. */
function sourceOf(init: AnyNode, text: string, site: Sites): { readonly hoist: string | null; readonly expr: string } {
	if (isPlainPath(init)) return { hoist: null, expr: sliceOf(init, text) };
	const name = tempName("d", site.hoist++);
	return { hoist: `const ${name} = (${sliceOf(init, text)});`, expr: name };
}

/** The plain bindings a pattern expands to (joined by `, `, so they splice into one `const`/`let`), reading from `source` (an identifier or member-path text). */
function declarationsFor(pattern: Pattern, source: string, text: string, what: string): string {
	if (pattern.type === "ObjectPattern") return objectDeclarations(pattern as ObjectPattern, source, text, what);
	if (pattern.type === "ArrayPattern") return arrayDeclarations(pattern as ArrayPattern, source, text, what);
	throw new Error(`${what}: unsupported destructuring pattern`);
}

function objectDeclarations(pattern: ObjectPattern, source: string, text: string, what: string): string {
	const parts: string[] = [];
	for (const prop of pattern.properties) {
		if (prop.type === "RestElement")
			throw new Error(`${what}: a rest element in destructuring allocates — name the fields you need`);
		const property = prop as AssignmentProperty;
		if (property.key.type !== "Identifier" || property.computed)
			throw new Error(`${what}: a computed key in destructuring is not supported`);
		parts.push(bindingFor(property.value as Pattern, `${source}.${property.key.name}`, text, what));
	}
	return parts.join(", ");
}

function arrayDeclarations(pattern: ArrayPattern, source: string, text: string, what: string): string {
	const parts: string[] = [];
	pattern.elements.forEach((el, k) => {
		if (el === null) return;
		if (el.type === "RestElement")
			throw new Error(`${what}: a rest element in destructuring allocates — name the fields you need`);
		parts.push(bindingFor(el as Pattern, `${source}[${k}]`, text, what));
	});
	return parts.join(", ");
}

/** One binding within a pattern, reading `read` once: a plain name, a default (`c = 1`, only used when `read` is `undefined`), or a nested pattern. */
function bindingFor(target: Pattern, read: string, text: string, what: string): string {
	if (target.type === "Identifier") return `${target.name} = ${read}`;
	if (target.type === "AssignmentPattern") {
		const left = target.left as Pattern;
		if (left.type !== "Identifier") throw new Error(`${what}: a default on a nested pattern is not supported`);
		return `${left.name} = ((${read}) === undefined ? (${sliceOf(target.right, text)}) : (${read}))`;
	}
	return declarationsFor(target, read, text, what);
}

function sliceOf(node: AnyNode, text: string): string {
	return text.slice(node.start, node.end);
}

/** An identifier, or a chain of plain/computed member accesses off one: reading it twice has no side effect. */
function isPlainPath(node: AnyNode): boolean {
	let cur: AnyNode = node;
	while (cur.type === "MemberExpression") {
		if (cur.optional) return false;
		cur = (cur as { object: AnyNode }).object;
	}
	return cur.type === "Identifier";
}

/** `for (const { a, b } of recs) body` → a plain `__sg_dofN` head, with the pattern's declarations placed at the top of the (now-block) body. */
function forOfEdit(node: ForOfStatement, text: string, site: Sites, what: string): TextEdit {
	const left = node.left as VariableDeclaration;
	const declarator = left.declarations[0] as VariableDeclarator;
	const name = tempName("dof", site.forOf++);
	const decls = `${left.kind} ${declarationsFor(declarator.id as Pattern, name, text, what)};`;
	const bodyText = node.body.type === "BlockStatement" ? sliceOf(node.body, text) : `{ ${sliceOf(node.body, text)} }`;
	const rewrittenBody = `{ ${decls} ${bodyText.slice(1)}`;
	const iterable = sliceOf(node.right, text);
	return { start: node.start, end: node.end, text: `for (${left.kind} ${name} of ${iterable}) ${rewrittenBody}` };
}

/** `[a, b] = [b, a]` (no `const`/`let`): the one destructuring-assignment form lifted, read as array patterns on both sides. */
function isPatternAssignment(node: AssignmentExpression): boolean {
	return node.left.type === "ArrayPattern" || node.left.type === "ObjectPattern";
}

/** The two-element swap, lowered to a temp-held exchange with no allocation; any other destructuring assignment is a loud error naming the exception. */
function swapEdit(node: AssignmentExpression, text: string, site: Sites, what: string): TextEdit {
	const left = node.left;
	const right = node.right;
	const swap =
		left.type === "ArrayPattern" &&
		right.type === "ArrayExpression" &&
		left.elements.length === 2 &&
		right.elements.length === 2
			? swapNames(left as ArrayPattern, right.elements as readonly (AnyNode | null)[])
			: null;
	if (swap === null)
		throw new Error(
			`${what}: destructuring assignment allocates an array literal — only the two-element swap, [a, b] = [b, a], is supported`,
		);
	const temp = tempName("sw", site.swap++);
	site.swapTemps.push(temp);
	return {
		start: node.start,
		end: node.end,
		text: `(${temp} = ${swap.a}, ${swap.a} = ${swap.b}, ${swap.b} = ${temp})`,
	};
}

/** `[a, b] = [b, a]`: both sides name the same two identifiers, crossed. Anything else (a non-identifier element, a non-crossed pair) is not the swap idiom. */
function swapNames(
	left: ArrayPattern,
	rightElements: readonly (AnyNode | null)[],
): { readonly a: string; readonly b: string } | null {
	const a = identifierName(left.elements[0] ?? null);
	const b = identifierName(left.elements[1] ?? null);
	const rb = identifierName(rightElements[0] ?? null);
	const ra = identifierName(rightElements[1] ?? null);
	if (a === null || b === null || rb === null || ra === null) return null;
	if (a !== ra || b !== rb) return null;
	return { a, b };
}

function identifierName(node: AnyNode | null): string | null {
	return node !== null && node.type === "Identifier" ? node.name : null;
}
