/**
 * Which helper parameter receives the tick's state record. A tick may pass
 * its state to a helper (`step(s)`), and that helper on to another; the
 * receiving parameter then reads and writes state fields as the tick's own
 * state parameter does (check-write.ts). A backend lays the record out once
 * per module, so a helper takes it in one parameter at every call: a call
 * that passes it elsewhere, or passes something else there, is a loud error.
 */

import type { AnyNode, CallExpression } from "acorn";
import type { ParsedPart } from "./check-function";
import type { FunctionNode } from "./parse-function";
import { walk } from "./walk";

interface HelperCall {
	readonly helper: string;
	readonly call: CallExpression;
}

/** Helper name → the name of its parameter that receives the state record. */
export function helperStateParams(
	tick: ParsedPart,
	helpers: ReadonlyMap<string, ParsedPart>,
): Map<string, string> {
	const names = new Map<ParsedPart, string>();
	const positions = new Map<string, number>();
	const tickState = paramName(tick.node, 0);
	if (tickState !== undefined) names.set(tick, tickState);
	const queue = tickState === undefined ? [] : [tick];
	for (let fn = queue.pop(); fn !== undefined; fn = queue.pop()) {
		const state = names.get(fn) as string;
		for (const { helper, call } of helperCalls(fn, helpers)) {
			const k = call.arguments.findIndex((arg) => isName(arg, state));
			if (k < 0 || positions.has(helper)) continue;
			positions.set(helper, k);
			const part = helpers.get(helper) as ParsedPart;
			const param = paramName(part.node, k);
			if (param === undefined) continue;
			names.set(part, param);
			queue.push(part);
		}
	}
	for (const fn of [tick, ...helpers.values()]) checkCalls(fn, names.get(fn), positions, helpers);
	const out = new Map<string, string>();
	for (const [name, part] of helpers) {
		const param = names.get(part);
		if (param !== undefined) out.set(name, param);
	}
	return out;
}

/** Each call to a helper that takes the state record passes the caller's own record there, and only there. */
function checkCalls(
	fn: ParsedPart,
	state: string | undefined,
	positions: ReadonlyMap<string, number>,
	helpers: ReadonlyMap<string, ParsedPart>,
): void {
	for (const { helper, call } of helperCalls(fn, helpers)) {
		const k = positions.get(helper);
		if (k === undefined) continue;
		const passed = state === undefined ? [] : stateArgs(call, state);
		if (passed.length !== 1 || passed[0] !== k)
			fn.fail(
				call,
				`helper '${helper}' takes the state record as argument ${k + 1} — pass the state record there, once, at every call`,
			);
	}
}

function stateArgs(call: CallExpression, state: string): number[] {
	const at: number[] = [];
	call.arguments.forEach((arg, k) => {
		if (isName(arg, state)) at.push(k);
	});
	return at;
}

function helperCalls(fn: ParsedPart, helpers: ReadonlyMap<string, ParsedPart>): HelperCall[] {
	const calls: HelperCall[] = [];
	walk(fn.node.body, (node) => {
		if (
			node.type === "CallExpression" &&
			node.callee.type === "Identifier" &&
			helpers.has(node.callee.name)
		)
			calls.push({ helper: node.callee.name, call: node });
	});
	return calls;
}

function paramName(fn: FunctionNode, k: number): string | undefined {
	const param = fn.params[k];
	return param?.type === "Identifier" ? param.name : undefined;
}

function isName(node: AnyNode, name: string): boolean {
	return node.type === "Identifier" && node.name === name;
}
