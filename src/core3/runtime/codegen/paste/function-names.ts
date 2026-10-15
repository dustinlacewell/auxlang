/**
 * The names a pasted function declares: its parameters and its locals. The
 * printer renames by name, which keeps the source's scoping only when no
 * name means two things — so a local may not reuse a parameter, a helper or
 * a name the printer itself resolves (Math, the constants).
 */

import type { FunctionNode } from "../../../module/tick-subset/parse-function";
import { walk } from "../../../module/tick-subset/walk";
import { refuse } from "./not-pasteable";

const RESOLVED = new Set(["Math", "undefined", "NaN", "Infinity", "arguments"]);

export interface FunctionNames {
	readonly params: readonly string[];
	readonly locals: ReadonlySet<string>;
}

export function functionNames(fn: FunctionNode, helpers: ReadonlySet<string>): FunctionNames {
	if (fn.async || fn.generator) refuse("async and generator functions are not pasteable");
	const params = fn.params.map((p) =>
		p.type === "Identifier" ? p.name : refuse("parameters must be plain names"),
	);
	const locals = declaredLocals(fn);
	for (const name of [...params, ...locals]) {
		if (RESOLVED.has(name) || helpers.has(name)) refuse(`'${name}' would shadow a pasted name`);
	}
	if (new Set(params).size !== params.length) refuse("duplicate parameter names");
	for (const name of locals)
		if (params.includes(name)) refuse(`local '${name}' shadows a parameter`);
	return { params, locals };
}

function declaredLocals(fn: FunctionNode): Set<string> {
	const names = new Set<string>();
	walk(fn.body, (node) => {
		if (node.type !== "VariableDeclarator") return;
		if (node.id.type !== "Identifier") refuse("destructuring is not pasteable");
		names.add(node.id.type === "Identifier" ? node.id.name : "");
	});
	return names;
}
