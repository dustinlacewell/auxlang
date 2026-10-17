/**
 * Definite-assignment analysis for one local (lift-let-no-value.ts): can
 * `statements` read `name` on any path before a plain assignment (`name =
 * ...`, the statement's own top-level effect) of it? Walked the same way
 * walk-statements.ts (front/types/) reads a backend's control flow: an `if`
 * needs both branches to assign before it is known assigned after, a switch
 * needs every case AND a `default` to assign or diverge, a loop's body may
 * run zero times so nothing inside it ever counts as definite, and a
 * statement list stops once a statement diverges (return/break/continue) —
 * nothing after it is reachable. A local that is simply never read is not
 * flagged — lifting it to `let x = 0` is safe either way.
 *
 * The first unsafe read found aborts the whole walk: the caller then
 * throws, naming the author's line.
 */

import type { AnyNode, IfStatement, SwitchStatement, VariableDeclaration } from "acorn";
import { eachChild } from "../front/parse/walk";

/** `true` when no path through `statements` can read `name` before it is assigned. */
export function assignedBeforeRead(name: string, statements: readonly AnyNode[]): boolean {
	return walkList(name, statements).ok;
}

/** `ok`: no path has read `name` before assigning it, so far. `assigned`: every path walked so far assigns `name`. `diverges`: nothing after this is reachable. */
interface Flow {
	readonly ok: boolean;
	readonly assigned: boolean;
	readonly diverges: boolean;
}

const UNTOUCHED: Flow = { ok: true, assigned: false, diverges: false };

function walkList(name: string, list: readonly AnyNode[]): Flow {
	let assigned = false;
	for (const statement of list) {
		const flow = walkStatement(name, statement, assigned);
		if (!flow.ok) return flow;
		if (flow.assigned) assigned = true;
		if (flow.diverges) return { ok: true, assigned, diverges: true };
	}
	return { ok: true, assigned, diverges: false };
}

/** One statement, given whether `name` is already known assigned on entry. */
function walkStatement(name: string, node: AnyNode, enteringAssigned: boolean): Flow {
	switch (node.type) {
		case "VariableDeclaration":
			return walkDeclaration(name, node, enteringAssigned);
		case "ExpressionStatement":
			return walkExpressionStatement(name, node.expression, enteringAssigned);
		case "BlockStatement":
			return walkList(name, node.body);
		case "IfStatement":
			return walkIf(name, node, enteringAssigned);
		case "SwitchStatement":
			return walkSwitch(name, node, enteringAssigned);
		case "ForStatement":
		case "ForOfStatement":
		case "ForInStatement":
		case "WhileStatement":
		case "DoWhileStatement":
			return reads(name, node, enteringAssigned) ? bad() : UNTOUCHED;
		case "ReturnStatement":
		case "ThrowStatement":
			return node.argument != null && reads(name, node.argument, enteringAssigned)
				? bad()
				: { ok: true, assigned: false, diverges: true };
		case "BreakStatement":
		case "ContinueStatement":
			return { ok: true, assigned: false, diverges: true };
		case "LabeledStatement":
			return walkStatement(name, node.body, enteringAssigned);
		default:
			return reads(name, node, enteringAssigned) ? bad() : UNTOUCHED;
	}
}

function bad(): Flow {
	return { ok: false, assigned: false, diverges: false };
}

/** A declaration's own initializers are read right-to-left as written; `name`'s own re-declaration (`let x = ...` shadowing, not possible for the local this lift tracks, but harmless if seen) does not assign the outer `name`. */
function walkDeclaration(name: string, node: VariableDeclaration, enteringAssigned: boolean): Flow {
	for (const d of node.declarations) if (d.init != null && reads(name, d.init, enteringAssigned)) return bad();
	return UNTOUCHED;
}

/** `name = <expr>` as the statement's whole effect assigns, once `<expr>` itself is checked for a read; any other expression statement is just checked for a read. */
function walkExpressionStatement(name: string, expr: AnyNode, enteringAssigned: boolean): Flow {
	if (expr.type === "AssignmentExpression" && expr.operator === "=" && expr.left.type === "Identifier" && expr.left.name === name) {
		if (reads(name, expr.right, enteringAssigned)) return bad();
		return { ok: true, assigned: true, diverges: false };
	}
	return reads(name, expr, enteringAssigned) ? bad() : UNTOUCHED;
}

function walkIf(name: string, node: IfStatement, enteringAssigned: boolean): Flow {
	if (reads(name, node.test, enteringAssigned)) return bad();
	const yes = walkStatement(name, node.consequent, enteringAssigned);
	if (!yes.ok) return yes;
	const no = node.alternate == null ? UNTOUCHED : walkStatement(name, node.alternate, enteringAssigned);
	if (!no.ok) return no;
	if (node.alternate == null) return { ok: true, assigned: false, diverges: false };
	if (yes.diverges) return no;
	if (no.diverges) return yes;
	return { ok: true, assigned: yes.assigned && no.assigned, diverges: yes.diverges && no.diverges };
}

/** Every `case`, including a `default`, must assign or diverge; a switch with no `default` can fall through doing nothing, so it never counts as assigning even if every present case does. */
function walkSwitch(name: string, node: SwitchStatement, enteringAssigned: boolean): Flow {
	const hasDefault = node.cases.some((k) => k.test == null);
	let allAssignOrDiverge = hasDefault;
	let allDiverge = hasDefault;
	for (const k of node.cases) {
		if (k.test != null && reads(name, k.test, enteringAssigned)) return bad();
		const flow = walkList(name, k.consequent);
		if (!flow.ok) return flow;
		if (!flow.assigned && !flow.diverges) allAssignOrDiverge = false;
		if (!flow.diverges) allDiverge = false;
	}
	return { ok: true, assigned: allAssignOrDiverge, diverges: allDiverge };
}

/** Whether `name` is read anywhere in `node` while not yet known assigned; a nested function/arrow is its own scope and is skipped (a helper closes over nothing — bind-sugar's other lifts already forbid that — so a read there is not a read of this local's path). */
function reads(name: string, node: AnyNode, enteringAssigned: boolean): boolean {
	if (enteringAssigned) return false;
	if (node.type === "Identifier") return node.name === name;
	if (node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") return false;
	let found = false;
	eachChild(node, function visit(child) {
		if (found) return;
		if (child.type === "FunctionExpression" || child.type === "ArrowFunctionExpression") return;
		if (child.type === "Identifier" && child.name === name) {
			found = true;
			return;
		}
		eachChild(child, visit);
	});
	return found;
}
