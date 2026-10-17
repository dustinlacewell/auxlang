/**
 * Lift a record/typed-array chosen through `?:` (MANIFESTO §5, card step 9)
 * to the plain rebind the tick subset already accepts: `const v = cond ?
 * voices[0] : voices[1]` becomes `let v = (voices[1]); if (cond) v =
 * (voices[0]);` — a `let` holding one branch, rebound to the other on the
 * test, same shape as an author's own `let a = s.a; if (i.in > 50) a = s.b;`
 * (both branches must then unify to the same ref shape, which the checker
 * itself proves). This lift fires only when BOTH branches are a plain
 * identifier or member path (reading either twice, or not at all, has no
 * side effect) — the positive signal that the author is choosing an
 * address, not computing an ordinary number or boolean (`cond ? 1 : 0` is
 * untouched, already in the subset as written) — AND neither branch is the
 * OTHER branch's own path with one more member step (`typeof lanes ===
 * "number" ? lanes : lanes[l]`, out.js's own idiom: `lanes` whole vs
 * `lanes[l]` one element, a plain number fallback, not an address choice —
 * the one case two paths agree on a root but are not actually choosing
 * between two addresses of the same shape).
 *
 * `??` is NOT lifted here: a record/typed-array read is never typed as
 * possibly `undefined` (type-member.ts's `fieldTy`/`listElement` always
 * give a `ref`), and comparing an already-ref-typed local to `undefined`
 * falls through `typeNumeric` to `STRUCTURED_OPERAND` ("an array or record
 * used as a number") — so there is no sound rewrite from `a ?? b` between
 * two refs into a form the checker accepts; a ref candidate's `??` is left
 * untouched, a loud error from the checker, same as today.
 *
 * Only a lone `const`/`let NAME = <select>` declarator is lifted (a sibling
 * plain declarator in the same statement, `const n = s.n, v = cond ? a : b`,
 * is not written by any module yet and is refused the same way, naming the
 * fix, rather than silently handled): the whole `VariableDeclaration`'s text
 * is replaced, keyword included.
 *
 * A returned record literal chosen through `?:` (`return cond ? { l: a, r: b
 * } : { l: b, r: a }`) is lifted per field, not allocated: `return { l: cond
 * ? a : b, r: cond ? b : a }` — a ternary between two plain values, which the
 * tick subset already accepts, inside the one record literal `infer-outs.ts`
 * already strips into named output writes. Both branches must name the same
 * keys; order need not match.
 */

import type {
	AnyNode,
	ConditionalExpression,
	ObjectExpression,
	Property,
	ReturnStatement,
	VariableDeclaration,
} from "acorn";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { parseFunction } from "../front/parse/parse-function";
import { eachChild } from "../front/parse/walk";

export function liftRecordSelect(src: string, what: string): string {
	const parsed = parseFunction(src, what);
	const edits: TextEdit[] = [];
	collect(parsed.node.body, parsed.expression, what, edits);
	if (edits.length === 0) return src;
	const local = edits.map((e) => ({ ...e, start: e.start - parsed.offset, end: e.end - parsed.offset }));
	return applyEdits(src, local);
}

function collect(node: AnyNode, text: string, what: string, edits: TextEdit[]): void {
	eachChild(node, function visit(child) {
		if (child.type === "VariableDeclaration" && isSelectDeclaration(child as VariableDeclaration, text)) {
			edits.push(declarationEdit(child as VariableDeclaration, text, what));
		} else if (child.type === "ReturnStatement" && isObjectConditional((child as ReturnStatement).argument)) {
			edits.push(returnEdit((child as ReturnStatement).argument as ConditionalExpression, text, what));
		} else {
			eachChild(child, visit);
		}
	});
}

/** A lone declarator whose init is `cond ? a : b`, both branches a plain path — the positive
 * signal this is an address select, not an ordinary numeric/boolean ternary left alone. */
function isSelectDeclaration(decl: VariableDeclaration, text: string): boolean {
	if (decl.declarations.length !== 1) return false;
	const d = decl.declarations[0];
	if (d === undefined || d.id.type !== "Identifier" || d.init === null || d.init === undefined) return false;
	return isSelect(d.init as AnyNode, text);
}

/** `cond ? a : b`, with both branches a plain identifier or member path, neither being the
 * other's own path with one more member step (the number-fallback idiom, not a pick between
 * two addresses). */
function isSelect(node: AnyNode, text: string): boolean {
	if (node.type !== "ConditionalExpression") return false;
	const n = node as ConditionalExpression;
	return isAddressPair(n.consequent, n.alternate, text);
}

function isAddressPair(a: AnyNode, b: AnyNode, text: string): boolean {
	if (!isPlainPath(a) || !isPlainPath(b)) return false;
	return !isPathPrefixOfOther(a, b, text);
}

/** Whether one branch's text equals the other's own path with its outermost member access
 * stripped — `lanes` vs `lanes[l]`, `v` vs `v.x`: a whole-vs-part number fallback, not a pick
 * between two addresses of the same shape. */
function isPathPrefixOfOther(a: AnyNode, b: AnyNode, text: string): boolean {
	return isOuterStepOf(a, b, text) || isOuterStepOf(b, a, text);
}

function isOuterStepOf(whole: AnyNode, part: AnyNode, text: string): boolean {
	if (part.type !== "MemberExpression") return false;
	const inner = (part as { object: AnyNode }).object;
	return sliceOf(whole, text) === sliceOf(inner, text);
}

function declarationEdit(decl: VariableDeclaration, text: string, what: string): TextEdit {
	const d = decl.declarations[0];
	if (d === undefined || d.id.type !== "Identifier") throw new Error(`${what}: unsupported declaration`);
	const name = d.id.name;
	const init = d.init as ConditionalExpression;
	const test = sliceOf(init.test, text);
	const whenFalse = sliceOf(init.alternate, text);
	const whenTrue = sliceOf(init.consequent, text);
	return { start: decl.start, end: decl.end, text: `let ${name} = (${whenFalse}); if (${test}) ${name} = (${whenTrue});` };
}

/** A plain identifier or member path: reading it (once, or not at all) has no side effect — the exact rule lift-destructuring and lift-for-of use for a hoist-free read. */
function isPlainPath(node: AnyNode): boolean {
	let cur: AnyNode = node;
	while (cur.type === "MemberExpression") {
		if (cur.optional) return false;
		cur = (cur as { object: AnyNode }).object;
	}
	return cur.type === "Identifier";
}

function sliceOf(node: AnyNode, text: string): string {
	return text.slice(node.start, node.end);
}

/** `return cond ? { ... } : { ... }`, both branches object literals of the same keys. */
function isObjectConditional(arg: AnyNode | null | undefined): boolean {
	if (arg === null || arg === undefined || arg.type !== "ConditionalExpression") return false;
	const node = arg as ConditionalExpression;
	if (node.consequent.type !== "ObjectExpression" || node.alternate.type !== "ObjectExpression") return false;
	return sameKeys(node.consequent as ObjectExpression, node.alternate as ObjectExpression);
}

function sameKeys(a: ObjectExpression, b: ObjectExpression): boolean {
	const ak = keysOf(a);
	const bk = keysOf(b);
	if (ak === null || bk === null || ak.length !== bk.length) return false;
	const set = new Set(ak);
	return bk.every((k) => set.has(k));
}

function keysOf(obj: ObjectExpression): readonly string[] | null {
	const keys: string[] = [];
	for (const prop of obj.properties) {
		if (prop.type !== "Property" || prop.key.type !== "Identifier" || prop.computed) return null;
		keys.push(prop.key.name);
	}
	return keys;
}

/** `cond ? { k: a, ... } : { k: b, ... }` → `{ k: cond ? a : b, ... }`, one ternary per field, in the first branch's key order. */
function returnEdit(node: ConditionalExpression, text: string, what: string): TextEdit {
	const test = sliceOf(node.test, text);
	const a = node.consequent as ObjectExpression;
	const b = node.alternate as ObjectExpression;
	const byName = new Map<string, Property>();
	for (const prop of b.properties) {
		const p = prop as Property;
		if (p.key.type === "Identifier") byName.set(p.key.name, p);
	}
	const fields = a.properties.map((prop) => {
		const p = prop as Property;
		if (p.key.type !== "Identifier") throw new Error(`${what}: a returned record's keys must be plain names`);
		const other = byName.get(p.key.name);
		if (other === undefined) throw new Error(`${what}: both branches of a returned record must name the same fields`);
		const whenTrue = sliceOf(p.value as AnyNode, text);
		const whenFalse = sliceOf(other.value as AnyNode, text);
		return `${p.key.name}: (${test}) ? (${whenTrue}) : (${whenFalse})`;
	});
	return { start: node.start, end: node.end, text: `{ ${fields.join(", ")} }` };
}
