/**
 * The internal state function's text: `(sr, cfg) => { const { k1 = d1, k2 }
 * = cfg; <setup statements, minus the final 'return (tick) => ...'>; <any
 * same-file helper the setup statements call, transitively>; return { f1,
 * f2 } }`. Fields are the setup locals the tick references (declaration
 * order); only those are carried into state — a setup local the tick never
 * reads is dead. A setup numeric const read from the file is inlined, same
 * as in the tick.
 */

import type { FunctionDeclaration, Statement } from "acorn";
import { walk } from "../front/parse/walk";
import { isReference } from "../front/scope/is-reference";
import { applyEdits, type TextEdit } from "../tick-build/text-edits";
import type { FileScope } from "./file-scope";
import type { SetupConfigKey } from "./setup-parts";

export function stateText(
	statements: readonly Statement[],
	fileText: string,
	config: readonly SetupConfigKey[],
	tickFreeNames: ReadonlySet<string>,
	locals: readonly string[],
	scope: FileScope,
): { readonly text: string; readonly fields: readonly string[] } {
	// Every statement but the final 'return (tick) => ...'.
	const body = statements.slice(0, -1);
	const fields = locals.filter((name) => tickFreeNames.has(name));

	const edits: TextEdit[] = [];
	const helperStmts = new Set<string>();
	for (const stmt of body) {
		walk(stmt as never, (node, parent, key) => {
			if (node.type !== "Identifier" || !isReference(parent, key)) return;
			const name = (node as { name: string }).name;
			const fileConst = scope.consts.get(name);
			if (fileConst !== undefined) {
				edits.push({ start: node.start, end: node.end, text: `(${fileConst.value})` });
				return;
			}
			const fn = scope.functions.get(name);
			if (fn !== undefined) helperStmts.add(name);
		});
	}

	// Transitive closure of same-file helpers the setup statements call.
	const included = new Set<string>();
	const queue = [...helperStmts];
	while (queue.length > 0) {
		const name = queue.shift() as string;
		if (included.has(name)) continue;
		included.add(name);
		const entry = scope.functions.get(name) as { node: FunctionDeclaration };
		walk(entry.node.body as never, (node, parent, key) => {
			if (node.type !== "Identifier" || !isReference(parent, key)) return;
			const inner = (node as { name: string }).name;
			if (scope.functions.has(inner) && !included.has(inner)) queue.push(inner);
		});
	}

	const configDestructure =
		config.length === 0
			? ""
			: `const { ${config.map((k) => (k.def === null ? k.name : `${k.name} = ${JSON.stringify(k.def)}`)).join(", ")} } = cfg;\n`;

	const helperDecls = [...included]
		.map((name) => fileText.slice((scope.functions.get(name) as { node: FunctionDeclaration }).node.start, (scope.functions.get(name) as { node: FunctionDeclaration }).node.end))
		.join("\n");

	const bodyText = body
		.map((stmt) => applyEdits(fileText.slice(stmt.start, stmt.end), shiftBy(editsWithin(edits, stmt), -stmt.start)))
		.join("\n");

	const returnText = `return { ${fields.join(", ")} };`;

	const text = `(sr, cfg) => {\n${configDestructure}${helperDecls ? `${helperDecls}\n` : ""}${bodyText}\n${returnText}\n}`;

	return { text, fields };
}

function editsWithin(edits: readonly TextEdit[], stmt: Statement): readonly TextEdit[] {
	return edits.filter((e) => e.start >= stmt.start && e.end <= stmt.end);
}

function shiftBy(edits: readonly TextEdit[], by: number): readonly TextEdit[] {
	return edits.map((edit) => ({ start: edit.start + by, end: edit.end + by, text: edit.text }));
}
