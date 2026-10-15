/**
 * The kind check (MANIFESTO §5.1): a boolean stays a boolean. JS keeps
 * `true` in a variable, field or output and `true === 1` is false, so a
 * backend that holds values in number slots cannot run a tick that lets a
 * boolean become one. The tick is walked from its parameters' real types
 * (fresh state, config, inputs, outputs); each helper call walks the helper
 * with its argument types, as a backend specialises it. Where only
 * truthiness counts (`if`, loops, `!`, `&&`/`||` inside them) booleans and
 * numbers may mix.
 */

import type { AnyNode } from "acorn";
import type { CheckedFunction } from "../check-function";
import { LAMBDA_BOOLEAN, MIXED_RETURNS } from "./kind-messages";
import { KindWalker } from "./kind-walker";
import { BOOL, NUM, OTHER, type ValueType, join, typeKey, typeOfValue } from "./value-type";

export interface ModuleKinds {
	readonly tick: CheckedFunction;
	readonly helpers: ReadonlyMap<string, CheckedFunction>;
	readonly state: Record<string, unknown>;
	readonly config: Record<string, unknown>;
}

interface Returned {
	readonly type: ValueType;
	readonly at: AnyNode;
}

export function checkModuleKinds(m: ModuleKinds): void {
	const returns = new Map<string, ValueType>();
	const call = (name: string, args: readonly ValueType[]): ValueType | null => {
		const helper = m.helpers.get(name);
		if (helper === undefined) return null;
		const key = `${name}(${args.map(typeKey).join(",")})`;
		let type = returns.get(key);
		if (type === undefined) {
			type = returnType(helper, new KindWalker(helper, call).run(args).returns);
			returns.set(key, type);
		}
		return type;
	};
	new KindWalker(m.tick, call).run([
		typeOfValue(m.state),
		{ k: "ins" },
		{ k: "outs" },
		typeOfValue(m.config),
		NUM,
		NUM,
	]);
}

/** A signal lambda `(s, sr, t)` returns a number. */
export function checkLambdaKinds(lambda: CheckedFunction): void {
	const walked = new KindWalker(lambda, () => null).run([typeOfValue({}), NUM, NUM]);
	for (const r of walked.returns) if (r.type.k === "bool") lambda.fail(r.at, LAMBDA_BOOLEAN);
}

/** Booleans, numbers, or else what the returns share; booleans mixed with numbers are a loud error. */
function returnType(helper: CheckedFunction, returns: readonly Returned[]): ValueType {
	const bool = returns.find((r) => r.type.k === "bool");
	const num = returns.find((r) => r.type.k === "num");
	if (bool !== undefined && num !== undefined)
		helper.fail(returns.indexOf(bool) > returns.indexOf(num) ? bool.at : num.at, MIXED_RETURNS);
	if (bool !== undefined) return BOOL;
	if (num !== undefined) return NUM;
	return returns.map((r) => r.type).reduce(join, OTHER);
}
