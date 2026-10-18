/**
 * User lambda hydration. Lambdas cross the worklet boundary as data (§8 —
 * alongside patch-defined module specs, see hydrate-specs.ts): their bound
 * text, wrapped for JS (module/bind-math/lambda-wrapper.ts), is compiled
 * ONCE at engine build via `new Function`, never per sample. Each occurrence
 * gets its own persistent state object, passed to the lambda every call.
 *
 * Signature: (state, sampleRate, time) => number
 */

import { lambdaWrapper } from "../dsp/bind-math/lambda-wrapper";
import type { BoundLambda } from "../types";

export type LambdaFn = (state: Record<string, unknown>, sampleRate: number, time: number) => number;

export interface LambdaSlot {
	readonly fn: LambdaFn;
	readonly state: Record<string, unknown>;
}

export function hydrateLambda(bound: BoundLambda): LambdaSlot {
	const src = lambdaWrapper(bound);
	let fn: unknown;
	try {
		fn = new Function(`"use strict"; return (${src});`)();
	} catch (err) {
		throw new Error(`lambda source failed to compile: ${String(err)}\n  source: ${src}`);
	}
	if (typeof fn !== "function") {
		throw new Error(`lambda source did not evaluate to a function: ${src}`);
	}
	return { fn: fn as LambdaFn, state: {} };
}
