/**
 * The role of each binding that holds one of a function's parameter
 * records. Tick parameters are (state, ins, outs, config, sampleRate[,
 * width]); a lambda's are (state, sampleRate, time); a helper's are plain
 * values (a record passed to one is typed by flow, front/types/). A variable
 * initialised to a record (`const t = s`) is that record: every rule on it
 * applies to the variable too.
 */

import type { FunctionKind, Role } from "@/engine/dsp/front/rules/rule-context";
import { type Binding, type Scopes, bindingOf } from "@/engine/dsp/front/scope/binding";

const TICK_ROLES: readonly Role[] = ["state", "ins", "outs", "config"];
const LAMBDA_ROLES: readonly Role[] = ["state"];

export function rolesOf(kind: FunctionKind, scopes: Scopes): Map<Binding, Role> {
	const roles = new Map<Binding, Role>();
	if (kind === "helper") return roles;
	(kind === "lambda" ? LAMBDA_ROLES : TICK_ROLES).forEach((role, k) => {
		const param = scopes.params[k];
		if (param !== undefined) roles.set(param, role);
	});
	addAliases(scopes, roles);
	return roles;
}

/** Each variable whose initial value names a record binding takes its role, through chains. */
function addAliases(scopes: Scopes, roles: Map<Binding, Role>): void {
	for (let grew = true; grew; ) {
		grew = false;
		for (const binding of scopes.bindings) {
			if (roles.has(binding)) continue;
			const init = binding.declarator?.init;
			const source = init?.type === "Identifier" ? bindingOf(scopes, init) : undefined;
			const role = source === undefined ? undefined : roles.get(source);
			if (role === undefined) continue;
			roles.set(binding, role);
			grew = true;
		}
	}
}
