/**
 * Analyse one function (a tick, a helper, or a signal lambda): resolve its
 * names, then run every rule on the resolved bindings and list its writes and
 * helper calls. Resolving comes first and apart: a set of helpers resolves
 * each against the whole set's names before any is checked.
 */

import type { ParsedPart } from "@/engine/dsp/front/parse/parse-part";
import { applyRules } from "@/engine/dsp/front/rules/apply-rules";
import type { FunctionKind, RuleContext } from "@/engine/dsp/front/rules/rule-context";
import { resolveBindings } from "@/engine/dsp/front/scope/resolve-bindings";
import { writeSites } from "@/engine/dsp/front/scope/writes";
import type { FunctionIR, ModuleFacts, ResolvedPart } from "./module-ir";
import { rolesOf } from "./roles";

export interface FunctionFacts extends Omit<ModuleFacts, "owner"> {
	readonly kind: FunctionKind;
	readonly helpers: ReadonlySet<string>;
}

export function resolvePart(parsed: ParsedPart, helpers: ReadonlySet<string>): ResolvedPart {
	return { ...parsed, scopes: resolveBindings(parsed.node, helpers) };
}

export function analyseFunction(part: ResolvedPart, facts: FunctionFacts): FunctionIR {
	const writes = writeSites(part.node, part.scopes);
	const ctx: RuleContext = {
		...facts,
		scopes: part.scopes,
		roles: rolesOf(facts.kind, part.scopes),
		writes,
		fail: part.fail,
		calls: [],
	};
	applyRules(part.node, ctx);
	return {
		...part,
		kind: facts.kind,
		writes,
		calls: ctx.calls,
	};
}
