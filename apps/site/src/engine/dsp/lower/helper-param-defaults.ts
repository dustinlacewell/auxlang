/**
 * Param defaults on a helper function (card step 11): `function env(x, k =
 * 0.5) { ... }` lifts to the forms the tick subset already accepts by
 * rewriting at the CALL SITE, never at runtime. A call that omits a
 * defaulted trailing argument gets the default expression text inserted in
 * its place; the helper's own param list loses its `= default`. Both
 * engines then run the exact same call, so the known trap — an explicit arg
 * that reads an array element past its end is `undefined` in JS but
 * NaN-or-0 in WASM — never arises: a default only ever fires on an OMITTED
 * argument, never on a value that happens to be `undefined` at runtime.
 *
 * A default must be a constant expression or reference an earlier param of
 * the same helper (so it can be evaluated at the call site); anything else
 * is a loud error naming the helper and the author's line. A defaulted
 * param followed by a non-defaulted one is the same JS restriction already
 * enforced by the parser that produced this AST, so it needs no extra
 * check here.
 *
 * This runs in the lowering (`lower-module.ts`), not in `bind-sugar/`,
 * because it is the one lift that needs to see every reached helper's
 * param list AND every call site across the tick and the other helpers —
 * `bindSugar` only ever sees one function's own text. Each of the tick's
 * and the reached helpers' own final texts is still rewritten as its own
 * self-contained text-to-text pass, same rule as every bind-sugar lift:
 * edits never add or remove a newline.
 */

import { type AnyNode, type AssignmentPattern, type FunctionDeclaration, parse } from "acorn";
import { applyEdits, type TextEdit } from "../tick-build/text-edits";
import { walk } from "../front/parse/walk";
import type { FileScope } from "./file-scope";

/** One helper's defaulted params, by position: the default's own text, or `null` for a plain param. */
type DefaultsByHelper = ReadonlyMap<string, readonly (string | null)[]>;

/** Reads each `names` helper's own declaration (from `scope`, as `helper-closure.ts` found it) and
 *  validates its defaults; throws naming the helper and its line on an unsupported default. */
export function helperParamDefaults(
	names: readonly string[],
	scope: FileScope,
	fileText: string,
	what: string,
): DefaultsByHelper {
	const table = new Map<string, readonly (string | null)[]>();
	for (const name of names) {
		const entry = scope.functions.get(name);
		if (entry === undefined) continue;
		table.set(name, defaultsOf(entry.node, fileText, name, what));
	}
	return table;
}

/** A positional list, one slot per param: the default's text if it has one and it validates, else `null`. */
function defaultsOf(fn: FunctionDeclaration, fileText: string, name: string, what: string): readonly (string | null)[] {
	const paramNames: string[] = [];
	const defaults: (string | null)[] = [];
	fn.params.forEach((param, k) => {
		if (param.type === "Identifier") {
			paramNames.push(param.name);
			defaults.push(null);
			return;
		}
		if (param.type !== "AssignmentPattern" || param.left.type !== "Identifier") {
			throw new Error(`${what}: ${where(fileText, param.start)}: helper '${name}' has an unsupported param form`);
		}
		const pattern = param as AssignmentPattern;
		const earlier = new Set(paramNames);
		assertConstantOrEarlierParam(pattern.right, earlier, name, fileText, what);
		paramNames.push((pattern.left as { name: string }).name);
		defaults.push(fileText.slice(pattern.right.start, pattern.right.end));
	});
	return defaults;
}

/** A default must be a literal, a simple unary-minus literal, or an expression built only from
 *  those and references to an earlier param of the same helper — never a call, a later param, or
 *  anything else that could read run-time state. */
function assertConstantOrEarlierParam(
	node: AnyNode,
	earlierParams: ReadonlySet<string>,
	helperName: string,
	fileText: string,
	what: string,
): void {
	walk(node, (child) => {
		if (child.type === "Identifier") {
			if (!earlierParams.has(child.name)) {
				throw new Error(
					`${what}: ${where(fileText, child.start)}: helper '${helperName}''s default references ` +
						`'${child.name}', not a constant or an earlier param`,
				);
			}
			return;
		}
		if (
			child.type === "Literal" ||
			child.type === "UnaryExpression" ||
			child.type === "BinaryExpression" ||
			child.type === "LogicalExpression" ||
			child.type === "ConditionalExpression" ||
			child.type === "MemberExpression"
		) {
			return;
		}
		if (child.type === "CallExpression") {
			throw new Error(
				`${what}: ${where(fileText, child.start)}: helper '${helperName}''s default calls a function — ` +
					`a default must be a constant expression or reference an earlier param`,
			);
		}
	});
}

/** The tick's or one helper's own final text, with every call to a defaulted helper that omits a
 *  trailing arg completed, and — when `stripDefaultsFor` names this very function — its own param
 *  list stripped of `= default`. */
export function applyHelperParamDefaults(
	text: string,
	defaults: DefaultsByHelper,
	stripDefaultsFor: string | null,
): string {
	const program = parse(text, { ecmaVersion: "latest" });
	const fn = soleFunctionOrArrow(program.body);
	const edits: TextEdit[] = [];
	walk(fn as unknown as AnyNode, (node) => {
		if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
		const callDefaults = defaults.get(node.callee.name);
		if (callDefaults === undefined) return;
		const missing = callDefaults.slice(node.arguments.length);
		if (missing.length === 0) return;
		for (const d of missing) {
			if (d === null) throw new Error(`a call to '${node.callee.name}' omits a required argument`);
		}
		const insertion = (missing as readonly string[]).map((d) => `, ${d}`).join("");
		const lastArg = node.arguments[node.arguments.length - 1];
		const at = lastArg !== undefined ? lastArg.end : node.callee.end + 1;
		edits.push({ start: at, end: at, text: insertion });
	});
	if (stripDefaultsFor !== null) {
		for (const param of fn.params) {
			if (param.type === "AssignmentPattern" && param.left.type === "Identifier") {
				edits.push({ start: param.left.end, end: param.end, text: "" });
			}
		}
	}
	if (edits.length === 0) return text;
	return applyEdits(text, edits);
}

function soleFunctionOrArrow(
	body: readonly AnyNode[],
): { readonly params: FunctionDeclaration["params"] } & AnyNode {
	const only = body[0];
	if (body.length === 1 && only !== undefined && only.type === "FunctionDeclaration") return only as never;
	if (body.length === 1 && only !== undefined && only.type === "ExpressionStatement") {
		const expr = (only as { expression: AnyNode }).expression;
		if (expr.type === "ArrowFunctionExpression" || expr.type === "FunctionExpression") return expr as never;
	}
	throw new Error("helper-param-defaults: expected one function");
}

function where(fileText: string, at: number): string {
	let line = 1;
	for (let k = 0; k < at; k++) if (fileText.charCodeAt(k) === 10) line++;
	return `line ${line}`;
}
