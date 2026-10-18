/**
 * Lift `??` off a local fed from a direct array element read (MANIFESTO §5,
 * card step 12): `const v = buf[i]; v ?? d` is not a direct element
 * (front/rules/check-nullish.ts), because an out-of-range read is
 * `undefined` in JS but `NaN` once kept in a WASM local — the two engines
 * would pick different sides. This lift reads the index once into a
 * generated temp and computes a validity flag beside the declaration (`i`
 * an integer in `[0, buf.length)`, the same rule the direct form itself
 * tests at run time: valid-index.ts); `v ?? d` then becomes `ok ? v : (d)`,
 * a plain ternary the tick subset already accepts on both engines.
 *
 * Only a local whose declaration is never written again is lifted: a
 * reassigned local (`let v = buf[i]; v = 0; v ?? d`) is left as written, so
 * the existing check still rejects it, naming the direct-element rule.
 */

import type { AnyNode, Identifier, LogicalExpression, MemberExpression } from "acorn";
import { type TextEdit, applyEdits } from "../tick-build/text-edits";
import { parseFunction } from "../front/parse/parse-function";
import { walk } from "../front/parse/walk";
import { tempName } from "./sugar-temps";

export function liftNullishElement(src: string, what: string): string {
	const parsed = parseFunction(src, what);
	const text = parsed.expression;
	const used = nullishLeftNames(parsed.node.body);
	const written = writtenNames(parsed.node.body);
	const validTemps = new Map<string, string>();
	const edits: TextEdit[] = [];
	let site = 0;

	walk(parsed.node.body, (node) => {
		if (node.type !== "VariableDeclaration") return;
		for (const d of node.declarations) {
			if (d.id.type !== "Identifier" || d.init === null || d.init === undefined) continue;
			if (!used.has(d.id.name) || written.has(d.id.name)) continue;
			const element = directElement(d.init);
			if (element === null) continue;
			const n = site++;
			const indexTemp = tempName("ni", n);
			const validTemp = tempName("nok", n);
			const arrText = text.slice(element.object.start, element.object.end);
			const indexText = text.slice(element.property.start, element.property.end);
			validTemps.set(d.id.name, validTemp);
			const hoist =
				`const ${indexTemp} = (${indexText}); ` +
				`const ${validTemp} = ${indexTemp} === Math.trunc(${indexTemp}) && ${indexTemp} >= 0 && ${indexTemp} < ${arrText}.length; `;
			edits.push({ start: node.start, end: node.start, text: hoist });
			edits.push({ start: d.init.start, end: d.init.end, text: `${arrText}[${indexTemp}]` });
		}
	});

	walk(parsed.node.body, (node) => {
		if (node.type !== "LogicalExpression" || node.operator !== "??") return;
		const name = leftName(node);
		const validTemp = name === null ? undefined : validTemps.get(name);
		if (validTemp === undefined) return;
		const right = text.slice(node.right.start, node.right.end);
		edits.push({ start: node.start, end: node.end, text: `(${validTemp} ? ${name} : (${right}))` });
	});

	if (edits.length === 0) return src;
	const local = edits.map((e) => ({ ...e, start: e.start - parsed.offset, end: e.end - parsed.offset }));
	return applyEdits(src, local);
}

/** Every name that is the bare-identifier left side of a `??` somewhere in `node`. */
function nullishLeftNames(node: AnyNode): Set<string> {
	const names = new Set<string>();
	walk(node, (child) => {
		if (child.type !== "LogicalExpression" || child.operator !== "??") return;
		const name = leftName(child);
		if (name !== null) names.add(name);
	});
	return names;
}

/** `<name> ?? ...`'s left name, when it is a bare identifier. */
function leftName(node: LogicalExpression): string | null {
	return node.left.type === "Identifier" ? (node.left as Identifier).name : null;
}

/** `<arr>[<idx>]`, a direct (computed, non-optional) element read. */
function directElement(node: AnyNode): MemberExpression | null {
	if (node.type !== "MemberExpression" || !node.computed || node.optional) return null;
	return node;
}

/** Every name an assignment or update expression targets anywhere in `node`. */
function writtenNames(node: AnyNode): Set<string> {
	const names = new Set<string>();
	walk(node, (child) => {
		if (child.type === "AssignmentExpression" && child.left.type === "Identifier") names.add(child.left.name);
		else if (child.type === "UpdateExpression" && child.argument.type === "Identifier")
			names.add(child.argument.name);
	});
	return names;
}
