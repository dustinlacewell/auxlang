/**
 * One node lane's tick, inlined into the render function: a block that
 * `return` branches out of, with the tick's parameters bound to the lane's
 * records — (state, ins, outs, config, sampleRate[, width]).
 */

import type { FunctionIR } from "../../dsp/front/module/module-ir";
import type { FunctionPlan } from "../../dsp/front/types/function-plan";
import type { CacheAccess, Calls, Intrinsics, TickRoles } from "../compile/emit-context";
import { emitDiscard } from "../compile/emit-expression";
import { emitStatements } from "../compile/emit-statement";
import type { FnEmitter } from "../compile/fn-emitter";
import { type Role, type Value, fixed, local } from "../compile/values";
import { paramWritten } from "../compile/written";
import { OP } from "../encode/opcodes";

export interface TickSite {
	readonly fn: FunctionIR;
	/** The tick's plan for this lane (runtime/specialise/specialise-nodes.ts). */
	readonly plan: FunctionPlan;
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
		fn: site.fn,
		plan: site.plan,
		roles: site.roles,
		cache: site.cache,
		calls: site.calls,
		intrinsics: site.intrinsics,
		ret: { k: "exit", depth: exit },
	};
	e.unbound(() => {
		bindParams(e, site);
		const body = site.fn.node.body;
		if (body.type === "BlockStatement") emitStatements(e, body.body);
		else emitDiscard(e, body);
	});
	e.exit();
}

/** The sample rate and width are constants, or f64 locals when the tick reassigns them. */
function bindParams(e: FnEmitter, site: TickSite): void {
	site.fn.node.params.forEach((param, k) => {
		if (param.type !== "Identifier") return e.fail(param, "tick parameters must be plain names");
		const role = ROLES[k];
		if (role !== undefined) {
			e.bind(param, { k: "role", role });
			return;
		}
		const value = k === 4 ? site.sampleRate : site.width;
		e.bind(param, paramWritten(site.fn, k) ? numberLocal(e, value) : fixed(value));
	});
}

function numberLocal(e: FnEmitter, value: number): Value {
	const index = e.local("f64");
	e.code.f64Const(value).set(index);
	return local(index, "f64");
}
