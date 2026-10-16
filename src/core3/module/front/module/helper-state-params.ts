/**
 * Which helper parameter receives the tick's state record. A tick may pass
 * its state to a helper (`step(s)`), and that helper on to another; the
 * receiving parameter then reads and writes state fields as the tick's own
 * state parameter does (check-write.ts). A backend lays the record out once
 * per module, so a helper takes it in one parameter at every call: a call
 * that passes it elsewhere, or passes something else there, is a loud error.
 * An argument passes the record when it names the caller's state parameter
 * binding (a local that shadows it does not).
 */

import type { AnyNode, CallExpression } from "acorn";
import { walk } from "@/core3/module/front/parse/walk";
import type { Binding } from "@/core3/module/front/scope/binding";
import type { ResolvedPart } from "./module-ir";

interface HelperCall {
	readonly helper: string;
	readonly call: CallExpression;
}

/** Helper name → its parameter binding that receives the state record. */
export function helperStateParams(
	tick: ResolvedPart,
	helpers: ReadonlyMap<string, ResolvedPart>,
): Map<string, Binding> {
	const states = new Map<ResolvedPart, Binding>();
	const positions = new Map<string, number>();
	const tickState = tick.scopes.params[0];
	if (tickState !== undefined) states.set(tick, tickState);
	const queue = tickState === undefined ? [] : [tick];
	for (let fn = queue.pop(); fn !== undefined; fn = queue.pop()) {
		const state = states.get(fn) as Binding;
		for (const { helper, call } of helperCalls(fn)) {
			const k = call.arguments.findIndex((arg) => names(fn, arg, state));
			if (k < 0 || positions.has(helper)) continue;
			positions.set(helper, k);
			const part = helpers.get(helper) as ResolvedPart;
			const param = part.scopes.params[k];
			if (param === undefined) continue;
			states.set(part, param);
			queue.push(part);
		}
	}
	for (const fn of [tick, ...helpers.values()]) checkCalls(fn, states.get(fn), positions);
	const out = new Map<string, Binding>();
	for (const [name, part] of helpers) {
		const param = states.get(part);
		if (param !== undefined) out.set(name, param);
	}
	return out;
}

/** Each call to a helper that takes the state record passes the caller's own record there, and only there. */
function checkCalls(
	fn: ResolvedPart,
	state: Binding | undefined,
	positions: ReadonlyMap<string, number>,
): void {
	for (const { helper, call } of helperCalls(fn)) {
		const k = positions.get(helper);
		if (k === undefined) continue;
		const passed = state === undefined ? [] : stateArgs(fn, call, state);
		if (passed.length !== 1 || passed[0] !== k)
			fn.fail(
				call,
				`helper '${helper}' takes the state record as argument ${k + 1} — pass the state record there, once, at every call`,
			);
	}
}

function stateArgs(fn: ResolvedPart, call: CallExpression, state: Binding): number[] {
	const at: number[] = [];
	call.arguments.forEach((arg, k) => {
		if (names(fn, arg, state)) at.push(k);
	});
	return at;
}

function helperCalls(fn: ResolvedPart): HelperCall[] {
	const calls: HelperCall[] = [];
	walk(fn.node.body, (node) => {
		if (node.type !== "CallExpression" || node.callee.type !== "Identifier") return;
		const r = fn.scopes.references.get(node.callee);
		if (r?.k === "helper") calls.push({ helper: r.name, call: node });
	});
	return calls;
}

function names(fn: ResolvedPart, node: AnyNode, binding: Binding): boolean {
	if (node.type !== "Identifier") return false;
	const r = fn.scopes.references.get(node);
	return r?.k === "binding" && r.binding === binding;
}
