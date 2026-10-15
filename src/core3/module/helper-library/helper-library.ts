/**
 * A library of tick-subset functions as tick helpers (math/lib, random/lib).
 * Each file holds one function that calls the others by plain name. As a
 * helper it is named `<prefix><name>`, with those calls renamed to match, so
 * it can never meet a module's own helper names. The text is ordinary helper
 * text: the interpreter builds it, the codegen pastes it and the WASM
 * backend compiles it like any helper.
 */

import { type AnyNode, type FunctionDeclaration, parse } from "acorn";
import type { RawFile } from "../../raw-files/raw-files";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { walk } from "../tick-subset/walk";

export interface HelperLibrary {
	/** The helpers (helper name → text) for library functions `names` and all they call, by name. */
	helpers(names: Iterable<string>): Record<string, string>;
	/** Every library function's plain name. */
	names(): string[];
}

interface LibraryFunction {
	/** The function's text, its calls renamed to helper names. */
	readonly text: string;
	/** The library functions it calls. */
	readonly calls: readonly string[];
}

/** `label` names the library in errors (`math/lib`); `files` is read once, on first use. */
export function helperLibrary(
	label: string,
	prefix: string,
	files: () => readonly RawFile[],
): HelperLibrary {
	let library: ReadonlyMap<string, LibraryFunction> | null = null;
	const lib = () => {
		library ??= buildLibrary(label, prefix, files());
		return library;
	};
	return {
		helpers: (names) => helpersFor(lib(), label, prefix, names),
		names: () => [...lib().keys()],
	};
}

function helpersFor(
	lib: ReadonlyMap<string, LibraryFunction>,
	label: string,
	prefix: string,
	names: Iterable<string>,
): Record<string, string> {
	const helpers: Record<string, string> = {};
	const pending = [...names];
	for (let name = pending.pop(); name !== undefined; name = pending.pop()) {
		const helper = prefix + name;
		if (helper in helpers) continue;
		const fn = lib.get(name);
		if (fn === undefined) throw new Error(`${label} has no function '${name}'`);
		helpers[helper] = fn.text;
		pending.push(...fn.calls);
	}
	return sortedByName(helpers);
}

function buildLibrary(
	label: string,
	prefix: string,
	files: readonly RawFile[],
): Map<string, LibraryFunction> {
	const declared = files.map((f) => ({ ...f, fn: soleFunction(label, f.file, f.text) }));
	const names = new Set(declared.map((d) => d.fn.id.name));
	const lib = new Map<string, LibraryFunction>();
	for (const { file, text, fn } of declared) {
		if (lib.has(fn.id.name)) throw new Error(`${label}/${file}: '${fn.id.name}' is defined twice`);
		lib.set(fn.id.name, renamed(text, fn, names, prefix));
	}
	return lib;
}

/** The one function declaration a library file holds. */
function soleFunction(
	label: string,
	file: string,
	text: string,
): FunctionDeclaration & { id: { name: string } } {
	const program = parse(text, { ecmaVersion: "latest" });
	const [only, ...rest] = program.body;
	if (only === undefined || rest.length > 0 || only.type !== "FunctionDeclaration")
		throw new Error(`${label}/${file}: a library file holds exactly one function declaration`);
	return only as FunctionDeclaration & { id: { name: string } };
}

/** The function's text with each call to a library function renamed to its helper name. */
function renamed(
	text: string,
	fn: FunctionDeclaration,
	names: ReadonlySet<string>,
	prefix: string,
): LibraryFunction {
	const edits: TextEdit[] = [];
	const calls = new Set<string>();
	walk(fn.body as AnyNode, (node) => {
		if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
		const callee = node.callee.name;
		if (!names.has(callee)) return;
		calls.add(callee);
		const start = node.callee.start - fn.start;
		edits.push({ start, end: node.callee.end - fn.start, text: prefix + callee });
	});
	return { text: applyEdits(text.slice(fn.start, fn.end), edits), calls: [...calls] };
}

function sortedByName(helpers: Record<string, string>): Record<string, string> {
	const sorted: Record<string, string> = {};
	for (const name of Object.keys(helpers).sort()) sorted[name] = helpers[name] as string;
	return sorted;
}
