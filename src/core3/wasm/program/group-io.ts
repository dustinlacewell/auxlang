/**
 * A node lane's port groups around its tick, as the interpreter's group
 * views (runtime/interpret-sample.ts): before the tick each in-group's f64
 * array (memory-layout.ts) takes its members' values this sample; after it,
 * each out-group's array is copied to its member outputs, before the
 * scatter reads them. Members are fixed at eval, so every address is static.
 */

import type { NodeRun } from "../../runtime/node-run";
import { compilerBug } from "../compile/compiler-bug";
import type { FnEmitter } from "../compile/fn-emitter";
import type { Value } from "../compile/values";
import type { Fail, LaneInput } from "./lane-roles";
import type { NodeMemory } from "./memory-layout";

/** `i.g[k] = <member k>` for every in-group. */
export function fillInGroups(
	e: FnEmitter,
	run: NodeRun,
	memory: NodeMemory,
	input: LaneInput,
	owner: string,
): void {
	const fail: Fail = (message) => compilerBug(owner, message);
	for (const g of run.groups.ins) {
		const at = groupAddress(memory, g.name, owner);
		g.ports.forEach((port, k) => {
			e.code.i32Const(0);
			pushNumber(e, input(port, fail), port, fail);
			e.code.storeF64(at + 8 * k);
		});
	}
}

/** `<member k> = o.g[k]` for every out-group, into the member outputs' locals. */
export function drainOutGroups(
	e: FnEmitter,
	run: NodeRun,
	memory: NodeMemory,
	mirror: (addr: number) => number,
	owner: string,
): void {
	for (const g of run.groups.outs) {
		const at = groupAddress(memory, g.name, owner);
		g.ports.forEach((port, k) => {
			const out = memory.outs[port];
			if (out === undefined) compilerBug(owner, `out-group member '${port}' has no output`);
			e.code
				.i32Const(0)
				.loadF64(at + 8 * k)
				.set(mirror(out));
		});
	}
}

function groupAddress(memory: NodeMemory, name: string, owner: string): number {
	const at = memory.groups[name];
	if (at === undefined) compilerBug(owner, `port group '${name}' has no memory`);
	return at;
}

/** A member's bound value as an f64: a constant or the local holding it. */
function pushNumber(e: FnEmitter, value: Value, port: string, fail: Fail): void {
	if (value.k === "static" && typeof value.value === "number") e.code.f64Const(value.value);
	else if (value.k === "local" && value.kind === "f64") e.code.get(value.index);
	else fail(`group member '${port}' is not a number`);
}
