/**
 * The role of each parameter binding. Tick parameters are (state, ins, outs,
 * config, sampleRate[, width]); a lambda's are (state, sampleRate, time); a
 * helper's are plain values, but for the one that receives the tick's state
 * record (helper-state-params.ts).
 */

import type { FunctionKind, Role } from "@/core3/module/front/rules/rule-context";
import type { Binding } from "@/core3/module/front/scope/binding";

const TICK_ROLES: readonly Role[] = ["state", "ins", "outs", "config"];
const LAMBDA_ROLES: readonly Role[] = ["state"];

export function rolesOf(
	kind: FunctionKind,
	params: readonly (Binding | undefined)[],
	stateParam?: Binding,
): Map<Binding, Role> {
	const roles = new Map<Binding, Role>();
	if (kind === "helper") {
		if (stateParam !== undefined) roles.set(stateParam, "state");
		return roles;
	}
	(kind === "lambda" ? LAMBDA_ROLES : TICK_ROLES).forEach((role, k) => {
		const param = params[k];
		if (param !== undefined) roles.set(param, role);
	});
	return roles;
}
