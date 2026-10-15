/**
 * One node lane's tick, inlined into the render function: a block that
 * `return` branches out of, with the tick's parameters bound to the lane's
 * records — (state, ins, outs, config, sampleRate[, width]).
 */

import type { FunctionNode } from "../../module/tick-subset/parse-function";
import { writes } from "../compile/assigned-names";
import type { CacheAccess, Calls, Intrinsics, TickRoles } from "../compile/emit-context";
import { emitDiscard } from "../compile/emit-expression";
import { emitStatements } from "../compile/emit-statement";
import type { FnEmitter } from "../compile/fn-emitter";
import { Scope } from "../compile/scope";
import { type Role, type Value, fixed, local } from "../compile/values";
import { OP } from "../encode/opcodes";

export interface TickSite {
	readonly fn: FunctionNode;
	readonly owner: string;
	readonly calls: Calls;
	readonly roles: TickRoles;
	readonly cache: CacheAccess;
	readonly intrinsics: Intrinsics | null;
	readonly sampleRate: number;
	readonly width: number;
}

const ROLES: readonly Role[] = ["state", "ins", "outs", "config"];

export function emitTick(e: FnEmitter, site: TickSite): void {
	const exit = e.enter(OP.block);
	e.ctx = {
		owner: site.owner,
		roles: site.roles,
		cache: site.cache,
		calls: site.calls,
		intrinsics: site.intrinsics,
		ret: { k: "exit", depth: exit },
	};
	e.within(paramScope(e, site), () => {
		const body = site.fn.body;
		if (body.type === "BlockStatement") emitStatements(e, body.body);
		else emitDiscard(e, body);
	});
	e.exit();
}

/** The sample rate and width are constants, or f64 locals when the tick reassigns them. */
function paramScope(e: FnEmitter, site: TickSite): Scope {
	const scope = new Scope();
	site.fn.params.forEach((param, k) => {
		if (param.type !== "Identifier") return e.fail(param, "tick parameters must be plain names");
		const role = ROLES[k];
		if (role !== undefined) {
			scope.declare(param.name, { k: "role", role });
			return;
		}
		const value = k === 4 ? site.sampleRate : site.width;
		const written = writes([site.fn.body], param.name);
		scope.declare(param.name, written ? numberLocal(e, value) : fixed(value));
	});
	return scope;
}

function numberLocal(e: FnEmitter, value: number): Value {
	const index = e.local("f64");
	e.code.f64Const(value).set(index);
	return local(index, "f64");
}
