/**
 * auxlang's math library (math/lib/) as tick helpers. Each file holds one
 * function that calls the others by plain name. As a helper it is named
 * `__math_<name>`, with those calls renamed to match, so it can never meet a
 * module's own helper names. The text is ordinary helper text: the checker
 * holds it to the tick subset, the interpreter builds it and the codegen
 * pastes it like any helper.
 */

import { type AnyNode, type FunctionDeclaration, parse } from "acorn";
import { mathSources } from "../../math/math-sources";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { walk } from "../tick-subset/walk";

/** The prefix of a math helper's name; module helpers may not use it. */
export const MATH_HELPER_PREFIX = "__math_";

interface MathHelper {
	/** The helper's text, its calls renamed to helper names. */
	readonly text: string;
	/** The library functions it calls. */
	readonly calls: readonly string[];
}

let library: ReadonlyMap<string, MathHelper> | null = null;

/** The helpers (helper name → text) for library functions `names` and all they call. */
export function mathHelpers(names: Iterable<string>): Record<string, string> {
	const lib = mathLibrary();
	const helpers: Record<string, string> = {};
	const pending = [...names];
	for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
		const helper = MATH_HELPER_PREFIX + name;
		if (helper in helpers) continue;
		const fn = lib.get(name);
		if (fn === undefined) throw new Error(`auxlang math has no function '${name}'`);
		helpers[helper] = fn.text;
		pending.push(...fn.calls);
	}
	return sortedByName(helpers);
}

/** Every library function's name. */
export function mathFunctionNames(): string[] {
	return [...mathLibrary().keys()];
}

function mathLibrary(): ReadonlyMap<string, MathHelper> {
	library ??= buildLibrary(mathSources());
	return library;
}

function buildLibrary(files: readonly { file: string; text: string }[]): Map<string, MathHelper> {
	const declared = files.map((f) => ({ ...f, fn: soleFunction(f.file, f.text) }));
	const names = new Set(declared.map((d) => d.fn.id.name));
	const lib = new Map<string, MathHelper>();
	for (const { file, text, fn } of declared) {
		if (lib.has(fn.id.name)) throw new Error(`math/lib/${file}: '${fn.id.name}' is defined twice`);
		lib.set(fn.id.name, renamed(text, fn, names));
	}
	return lib;
}

/** The one function declaration a library file holds. */
function soleFunction(file: string, text: string): FunctionDeclaration & { id: { name: string } } {
	const program = parse(text, { ecmaVersion: "latest" });
	const [only, ...rest] = program.body;
	if (only === undefined || rest.length > 0 || only.type !== "FunctionDeclaration")
		throw new Error(`math/lib/${file}: a library file holds exactly one function declaration`);
	return only as FunctionDeclaration & { id: { name: string } };
}

/** The function's text with each call to a library function renamed to its helper name. */
function renamed(text: string, fn: FunctionDeclaration, names: ReadonlySet<string>): MathHelper {
	const edits: TextEdit[] = [];
	const calls = new Set<string>();
	walk(fn.body as AnyNode, (node) => {
		if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
		const callee = node.callee.name;
		if (!names.has(callee)) return;
		calls.add(callee);
		const start = node.callee.start - fn.start;
		edits.push({ start, end: node.callee.end - fn.start, text: MATH_HELPER_PREFIX + callee });
	});
	return { text: applyEdits(text.slice(fn.start, fn.end), edits), calls: [...calls] };
}

function sortedByName(helpers: Record<string, string>): Record<string, string> {
	const sorted: Record<string, string> = {};
	for (const name of Object.keys(helpers).sort()) sorted[name] = helpers[name] as string;
	return sorted;
}
