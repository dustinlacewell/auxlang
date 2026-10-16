/**
 * A defmod file's top-level scope a setup or tick can reference: named
 * `function` declarations (helpers, `helper-closure.ts` follows their call
 * graph) and numeric `const` bindings (inlined at lowering, not carried as
 * state). Nothing else is file scope; a top-level `let`, a non-literal
 * `const`, or anything nested is invisible here.
 */

import type { AnyNode, FunctionDeclaration, Program } from "acorn";

export interface FileScope {
	readonly functions: ReadonlyMap<string, { readonly node: FunctionDeclaration; readonly start: number }>;
	readonly consts: ReadonlyMap<string, { readonly value: number; readonly start: number }>;
}

export function fileScope(program: Program): FileScope {
	const functions = new Map<string, { node: FunctionDeclaration; start: number }>();
	const consts = new Map<string, { value: number; start: number }>();

	for (const stmt of program.body) {
		if (stmt.type === "FunctionDeclaration" && stmt.id !== null) {
			functions.set(stmt.id.name, { node: stmt, start: stmt.start });
			continue;
		}
		if (stmt.type === "VariableDeclaration" && stmt.kind === "const") {
			for (const decl of stmt.declarations) {
				if (decl.id.type !== "Identifier" || decl.init === null || decl.init === undefined) continue;
				const value = numericLiteral(decl.init);
				if (value === null) continue;
				consts.set(decl.id.name, { value, start: decl.start });
			}
		}
	}

	return { functions, consts };
}

function numericLiteral(node: AnyNode): number | null {
	if (node.type === "Literal" && typeof node.value === "number") return node.value;
	if (node.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "Literal") {
		const value = node.argument.value;
		if (typeof value === "number") return -value;
	}
	return null;
}
