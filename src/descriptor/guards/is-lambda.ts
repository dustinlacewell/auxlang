import type { SignalLambda } from "../types";

/**
 * Check if a value is an inline signal lambda.
 * Signal lambdas are functions: (state, sampleRate, time) => number
 */
export function isSignalLambda(value: unknown): value is SignalLambda {
	return typeof value === "function";
}
