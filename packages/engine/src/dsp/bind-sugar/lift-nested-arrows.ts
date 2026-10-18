/**
 * Lift a nested arrow that writes no captured local (MANIFESTO §5, card step
 * 8) to a top-level helper, the form `helper-closure.ts` already resolves a
 * call to by name. `const lerp = (a, b, t) => a + (b - a) * t`, called later
 * as `lerp(x, y, z)`: the arrow's own params stay in place; every free name it
 * only READS from the enclosing scope becomes an extra trailing param, filled
 * in at each call site by reading that same name again (still in scope
 * there, so splicing it in as an argument is exactly what the closure would
 * have read). The declaration's own text is blanked in place (no newline
 * added or removed), so the caller's lines keep their numbers; a call site
 * keeps its own line, widened only by the extra arguments appended on it.
 *
 * A free name the arrow WRITES (assigned, updated, the root of an assigned
 * member target, or passed as a call argument — the same write rule
 * tick-writes.ts uses) cannot be a param, so it is refused with a loud error
 * naming the arrow and the name. A nested arrow inside the hoisted one lifts
 * first (innermost first), built bottom-up like lift-destructuring.ts, so
 * both its own blanked declaration and its own calls' widened arguments are
 * already baked into the text by the time the outer arrow's body is sliced
 * out as a helper.
 *
 * Only a `const name = (params) => body` declarator, one name per
 * declaration, is lifted; anything else (an arrow passed inline, an arrow
 * bound by `let`/`var`) is left for the tick subset's own nested-function
 * rule to refuse.
 */

import type {
	AnyNode,
	ArrowFunctionExpression,
	AssignmentExpression,
	CallExpression,
	Identifier,
	UpdateExpression,
	VariableDeclaration,
} from "acorn";
import type { Resolution } from "../front/scope/binding";
import type { FunctionNode } from "../front/parse/parse-function";
import { parseFunction } from "../front/parse/parse-function";
import { eachChild, walk } from "../front/parse/walk";
import { resolveBindings } from "../front/scope/resolve-bindings";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";

export interface NestedArrowsLift {
	readonly text: string;
	/** Hoisted helper name -> its top-level function text, in the order they were found. */
	readonly helpers: ReadonlyMap<string, string>;
}

/** A hoisted helper's own arrow params and block body, before its transitive captures (calls into another lifted helper that itself captures a name) are known. */
interface HoistedHelper {
	readonly ownParams: readonly string[];
	readonly body: string;
}

export function liftNestedArrows(src: string, what: string): NestedArrowsLift {
	const parsed = parseFunction(src, what);
	const pending = new Map<string, HoistedHelper>();
	const ownCaptures = new Map<string, readonly string[]>();
	const body = parsed.node.body as AnyNode;
	const rebuilt = transform(body, parsed.expression, what, pending, ownCaptures);
	if (pending.size === 0) return { text: src, helpers: new Map() };
	// A helper that calls another lifted helper needs that helper's own captures too, so its
	// own call site can be widened with a name it can actually read: closeCaptures finds the
	// fixed point of "my captures, plus every callee's captures" over the lifted names' own
	// call graph (read straight from each pending body's text, before any widening).
	const captures = closeCaptures(pending, ownCaptures);
	const widened = widenCalls(rebuilt, captures, what);
	const helpers = new Map(
		[...pending].map(([name, helper]) => {
			const params = [...helper.ownParams, ...(captures.get(name) as readonly string[])].join(", ");
			return [name, `function ${name}(${params}) ${widenCalls(helper.body, captures, what)}`] as const;
		}),
	);
	return {
		text: src.slice(0, body.start - parsed.offset) + widened + src.slice(body.end - parsed.offset),
		helpers,
	};
}

/** `node`'s own text, with every liftable declaration within it (innermost first) blanked, its helper (own params and block body, not yet widened) and own captured-reads list recorded. */
function transform(
	node: AnyNode,
	text: string,
	what: string,
	pending: Map<string, HoistedHelper>,
	ownCaptures: Map<string, readonly string[]>,
): string {
	const edits: TextEdit[] = [];
	eachChild(node, function visit(child) {
		const found = child.type === "VariableDeclaration" ? liftableDeclarator(child as VariableDeclaration) : null;
		if (found === null) {
			eachChild(child, visit);
			return;
		}
		const decl = child as VariableDeclaration;
		const innerBody = transform(found.arrow.body as AnyNode, text, what, pending, ownCaptures);
		const bodyText =
			found.arrow.body.type === "BlockStatement" ? innerBody : `{ return (${innerBody}); }`;
		const captured = capturedReads(found.arrow, found.name, what);
		if (pending.has(found.name))
			throw new Error(`${what}: '${found.name}' is lifted from more than one nested arrow`);
		pending.set(found.name, { ownParams: found.arrow.params.map((p) => sliceOf(p, text)), body: bodyText });
		ownCaptures.set(found.name, captured);
		edits.push({ start: decl.start, end: decl.end, text: blank(sliceOf(decl, text)) });
	});
	if (edits.length === 0) return text.slice(node.start, node.end);
	return applyEditsWithin(node, edits, text);
}

/** The fixed point of "a lifted name's own captures, plus every other lifted name it calls' captures", over the lifted names' own call graph — so a helper that only relays to another (`const outer = (a) => inner(a)`) still gets the param the relayed call needs. Recursion among lifted names is left for the existing helper-recursion check to refuse once the call graph reaches it; this closure only unions sets, so a cycle just stops growing once nothing changes. */
function closeCaptures(
	pending: ReadonlyMap<string, HoistedHelper>,
	ownCaptures: ReadonlyMap<string, readonly string[]>,
): Map<string, readonly string[]> {
	const names = [...pending.keys()];
	const calleesOf = new Map(names.map((name) => [name, calledLiftedNames(pending.get(name) as HoistedHelper, names)]));
	const current = new Map<string, string[]>(names.map((name) => [name, [...(ownCaptures.get(name) as string[])]]));
	let changed = true;
	while (changed) {
		changed = false;
		for (const name of names) {
			const own = current.get(name) as string[];
			for (const callee of calleesOf.get(name) as readonly string[]) {
				for (const cap of current.get(callee) as string[]) {
					if (!own.includes(cap)) {
						own.push(cap);
						changed = true;
					}
				}
			}
		}
	}
	return current;
}

/** Every other lifted name called by name within `helper`'s own (unwidened) body text. */
function calledLiftedNames(helper: HoistedHelper, names: readonly string[]): readonly string[] {
	const nameSet = new Set(names);
	const parsed = parseFunction(`() => ${helper.body}`, "call-graph scan");
	const found = new Set<string>();
	walk(parsed.node.body as unknown as AnyNode, (node) => {
		if (node.type !== "CallExpression") return;
		const callee = (node as CallExpression).callee;
		if (callee.type === "Identifier" && nameSet.has(callee.name)) found.add(callee.name);
	});
	return [...found];
}

/** `const name = (params) => body`, one declarator, the whole declaration one arrow. */
function liftableDeclarator(
	decl: VariableDeclaration,
): { readonly name: string; readonly arrow: ArrowFunctionExpression } | null {
	if (decl.kind !== "const" || decl.declarations.length !== 1) return null;
	const [only] = decl.declarations;
	if (only === undefined || only.id.type !== "Identifier" || only.init === null || only.init === undefined) return null;
	if (only.init.type !== "ArrowFunctionExpression") return null;
	return { name: only.id.name, arrow: only.init };
}

/** The arrow's free reads that resolve outside it: read-only ones become trailing params, in the order first referenced; a written one is a loud error naming it. */
function capturedReads(arrow: ArrowFunctionExpression, name: string, what: string): readonly string[] {
	const scopes = resolveBindings(arrow as unknown as FunctionNode, new Set());
	const order: string[] = [];
	const seen = new Set<string>();
	for (const resolution of scopes.references.values()) {
		if (resolution.k !== "free") continue;
		if (seen.has(resolution.name)) continue;
		seen.add(resolution.name);
		order.push(resolution.name);
	}
	const written = new Set<string>();
	walk(arrow.body as unknown as AnyNode, (node) => markWrite(node, scopes.references, written));
	for (const captured of order) {
		if (written.has(captured))
			throw new Error(
				`${what}: the nested arrow lifted as '${name}' writes '${captured}', a name from the enclosing scope — ` +
					`a lifted helper has no closure, so it cannot write through a captured name`,
			);
	}
	return order;
}

/** The same write shapes tick-writes.ts counts: an assignment target, an update target, or a call argument — each rooted at a free identifier. */
function markWrite(node: AnyNode, references: ReadonlyMap<Identifier, Resolution>, written: Set<string>): void {
	if (node.type === "AssignmentExpression") {
		markIfFree(rootIdentifier((node as AssignmentExpression).left as unknown as AnyNode), references, written);
	} else if (node.type === "UpdateExpression") {
		markIfFree(rootIdentifier((node as UpdateExpression).argument as unknown as AnyNode), references, written);
	} else if (node.type === "CallExpression") {
		for (const arg of (node as CallExpression).arguments) {
			if (arg.type === "Identifier") markIfFree(arg as Identifier, references, written);
		}
	}
}

function markIfFree(id: Identifier | null, references: ReadonlyMap<Identifier, Resolution>, written: Set<string>): void {
	if (id === null) return;
	const resolution = references.get(id);
	if (resolution !== undefined && resolution.k === "free") written.add(resolution.name);
}

function rootIdentifier(node: AnyNode): Identifier | null {
	let cur = node;
	while (cur.type === "MemberExpression") cur = (cur as { object: AnyNode }).object;
	return cur.type === "Identifier" ? (cur as Identifier) : null;
}

/** Every call to a lifted name, anywhere in the already-rebuilt text (an arrow's own body text, since a blanked declaration leaves no trace a call could be confused with — every remaining `name(...)` is a real call), widened with that helper's own captured params. `text` is a function BODY's text (braces included for a block, or a bare expression for an arrow's own), so it is wrapped as a throwaway arrow to parse. */
function widenCalls(text: string, captures: ReadonlyMap<string, readonly string[]>, what: string): string {
	const prefix = "() => ";
	const parsed = parseFunction(`${prefix}${text}`, what);
	const shift = parsed.offset + prefix.length;
	const edits: TextEdit[] = [];
	walk(parsed.node.body as unknown as AnyNode, (node) => {
		if (node.type !== "CallExpression") return;
		const call = node as CallExpression;
		if (call.callee.type !== "Identifier") return;
		const caps = captures.get(call.callee.name);
		if (caps === undefined || caps.length === 0) return;
		const sep = call.arguments.length === 0 ? "" : ", ";
		edits.push({ start: call.end - 1, end: call.end - 1, text: `${sep}${caps.join(", ")}` });
	});
	if (edits.length === 0) return text;
	const local = edits.map((e) => ({ ...e, start: e.start - shift, end: e.end - shift }));
	return applyEdits(text, local);
}

function applyEditsWithin(node: AnyNode, edits: readonly TextEdit[], text: string): string {
	const sorted = [...edits].sort((a, b) => b.start - a.start);
	let out = text.slice(node.start, node.end);
	const base = node.start;
	for (const e of sorted) out = out.slice(0, e.start - base) + e.text + out.slice(e.end - base);
	return out;
}

function sliceOf(node: AnyNode, text: string): string {
	return text.slice(node.start, node.end);
}

/** `decl`'s own text, with every character but line breaks replaced by a space, so later text keeps its line numbers. */
function blank(declText: string): string {
	return declText.replace(/[^\n]/g, " ");
}
