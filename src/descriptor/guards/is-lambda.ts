import type { SignalLambda } from "../types";

/**
 * Check if a value is an inline signal lambda.
 * Signal lambdas take exactly 2 parameters: (state, sampleRate) => number
 */
export function isSignalLambda(value: unknown): value is SignalLambda {
	return typeof value === "function" && value.length === 2;
}
