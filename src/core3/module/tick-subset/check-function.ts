/**
 * Check one function (a tick, a helper, or a signal lambda) against the tick
 * subset: parse its text, name its parameters and locals, then walk every
 * node through the rule checks. Returns the helper calls it makes, for the
 * module's recursion check.
 */

import type { AnyNode, Node as AcornNode } from "acorn";
import { locateInSource } from "../source-text";
import { checkCall } from "./check-call";
import { checkForm } from "./check-form";
import { checkMember } from "./check-member";
import { checkName } from "./check-name";
import { checkBinary, checkStringLiteral, checkUnary } from "./check-string";
import { checkWrite } from "./check-write";
import { type FunctionNode, parseFunction } from "./parse-function";
import type { FunctionKind, ParamRoles, SubsetContext } from "./subset-context";
import { violation } from "./violation";
import { walk } from "./walk";

export interface FunctionCheck {
	readonly kind: FunctionKind;
	readonly src: string;
	/** `defmod('noise')` or `lambda`. */
	readonly owner: string;
	/** `tick`, `helper 'step'`, `lambda`. */
	readonly part: string;
	readonly helpers: ReadonlySet<string>;
	readonly ins: ReadonlySet<string>;
	readonly outs: ReadonlySet<string>;
	readonly state: Record<string, unknown>;
}

export interface CheckedFunction {
	readonly calls: SubsetContext["calls"];
	readonly fail: SubsetContext["fail"];
}

export function checkFunction(check: FunctionCheck): CheckedFunction {
	const site = { owner: check.owner, part: check.part, origin: locateInSource(check.src) };
	const fail = (node: AcornNode, message: string): never => {
		throw violation(site, node.loc?.start.line ?? 1, message);
	};
	const fn = parseFunction(check.src, `${check.owner} ${check.part}`).node;
	const params = paramNames(fn, fail);
	const ctx: SubsetContext = {
		kind: check.kind,
		params: new Set(params),
		locals: localNames(fn),
		roles: rolesOf(check.kind, params),
		helpers: check.helpers,
		ins: check.ins,
		outs: check.outs,
		state: check.state,
		fail,
		calls: [],
	};
	walk(fn.body, (node, parent, key) => visit(node, parent, key, ctx));
	return { calls: ctx.calls, fail };
}

function visit(
	node: AnyNode,
	parent: AnyNode | null,
	key: string | null,
	ctx: SubsetContext,
): void {
	checkForm(node, ctx);
	if (node.type === "Identifier") checkName(node, parent, key, ctx);
	else if (node.type === "Literal") checkStringLiteral(node, parent, key, ctx);
	else if (node.type === "CallExpression") checkCall(node, ctx);
	else if (node.type === "MemberExpression") checkMember(node, parent, key, ctx);
	else if (node.type === "UnaryExpression") checkUnary(node, parent, ctx);
	else if (node.type === "BinaryExpression") checkBinary(node, ctx);
	else if (node.type === "AssignmentExpression") {
		if (node.operator === "**=")
			ctx.fail(node, "`**=` is not allowed — write `x = x ** y` (`**` is auxlang's pow)");
		checkWrite(node.left, ctx);
	}
	else if (node.type === "UpdateExpression") checkWrite(node.argument, ctx);
}

function paramNames(fn: FunctionNode, fail: SubsetContext["fail"]): string[] {
	if (fn.async) fail(fn, "async functions are not allowed");
	if (fn.generator) fail(fn, "generators are not allowed");
	return fn.params.map((param) => {
		if (param.type !== "Identifier")
			return fail(param, "parameters must be plain names (no destructuring, defaults or rest)");
		return param.name;
	});
}

function localNames(fn: FunctionNode): Set<string> {
	const names = new Set<string>();
	walk(fn.body, (node) => {
		if (node.type === "VariableDeclarator" && node.id.type === "Identifier")
			names.add(node.id.name);
	});
	return names;
}

/** Tick parameters are (state, ins, outs, config, sampleRate[, width]); a lambda's are (state, sampleRate, time). */
function rolesOf(kind: FunctionKind, params: readonly string[]): ParamRoles {
	const [first, second, third, fourth] = params;
	if (kind === "helper") return {};
	if (kind === "lambda") return first === undefined ? {} : { state: first };
	return {
		...(first !== undefined ? { state: first } : {}),
		...(second !== undefined ? { ins: second } : {}),
		...(third !== undefined ? { outs: third } : {}),
		...(fourth !== undefined ? { config: fourth } : {}),
	};
}
