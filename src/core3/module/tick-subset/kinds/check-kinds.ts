/**
 * The kind check (MANIFESTO §5.1): a boolean stays a boolean. JS keeps
 * `true` in a variable, field or output and `true === 1` is false, so a
 * backend that holds values in number slots cannot run a tick that lets a
 * boolean become one. The check judges each node lane's tick plan
 * (front/types/specialise.ts, at build on every engine), typed from the
 * lane's real state, config, inputs and sample rate, and each helper plan it
 * calls. Where only
 * truthiness counts (`if`, loops, `!`, `&&`/`||` inside them) booleans and
 * numbers may mix. Code a known test leaves dead is not judged.
 */

import type { FunctionIR } from "@/core3/module/front/module/module-ir";
import { calleesOf } from "@/core3/module/front/types/callees";
import { type FunctionPlan, planFunction } from "@/core3/module/front/types/function-plan";
import type { PlanEvent } from "@/core3/module/front/types/plan-events";
import { NUM, known } from "@/core3/module/front/types/ty";
import {
	INTO_BOOLEAN,
	LAMBDA_BOOLEAN,
	MIXED,
	MIXED_RETURNS,
	STEP_BOOLEAN,
	STORED,
} from "./kind-messages";
import { classOf, conflict } from "./message-class";

const NO_HELPERS: ReadonlyMap<string, FunctionIR> = new Map();

/** A tick plan for one instance (front/types/specialise.ts) and the helper plans it calls. */
export function judgeKinds(plan: FunctionPlan): void {
	judge(plan, new Set());
}

/** A signal lambda `(s, sr, t)` returns a number. */
export function checkLambdaKinds(lambda: FunctionIR): void {
	const plan = planFunction(lambda, [known(undefined), NUM, NUM], null, calleesOf(NO_HELPERS));
	judge(plan, new Set());
	for (const r of plan.returns) if (classOf(r.ty) === "bool") lambda.fail(r.at, LAMBDA_BOOLEAN);
}

/** The plan's events in walk order; a helper plan is judged at its first call. */
function judge(plan: FunctionPlan, judged: Set<FunctionPlan>): void {
	for (const event of plan.events) {
		if (event.k !== "call") judgeEvent(plan.ir, event);
		else if (!judged.has(event.plan)) {
			judged.add(event.plan);
			judge(event.plan, judged);
			judgeReturns(event.plan);
		}
	}
}

function judgeEvent(ir: FunctionIR, event: Exclude<PlanEvent, { k: "call" }>): void {
	switch (event.k) {
		case "store": {
			const place = classOf(event.place);
			const value = classOf(event.value);
			if (place === "num" && value === "bool") ir.fail(event.node, STORED);
			if (place === "bool" && value === "num") ir.fail(event.node, INTO_BOOLEAN);
			return;
		}
		case "compound":
			if (classOf(event.place) === "bool") ir.fail(event.node, INTO_BOOLEAN);
			return;
		case "step":
			if (classOf(event.place) === "bool") ir.fail(event.node, STEP_BOOLEAN);
			return;
		case "paths":
			if (conflict(event.a, event.b)) ir.fail(event.node, MIXED);
			return;
	}
}

/** A helper returns booleans or numbers, never both. */
function judgeReturns(plan: FunctionPlan): void {
	const returns = plan.returns;
	const bool = returns.findIndex((r) => classOf(r.ty) === "bool");
	const num = returns.findIndex((r) => classOf(r.ty) === "num");
	if (bool < 0 || num < 0) return;
	plan.ir.fail((returns[Math.max(bool, num)] as (typeof returns)[number]).at, MIXED_RETURNS);
}
