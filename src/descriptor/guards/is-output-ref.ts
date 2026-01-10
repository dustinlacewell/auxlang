import type { OutputRef } from "../types";

export function isOutputRef(value: unknown): value is OutputRef {
	if (value === null || value === undefined) return false;
	// Check for OutputRef properties - can be on an object or a callable (ChainableOutput)
	const v = value as Record<string, unknown>;
	return (
		typeof v.descriptorId === "string" &&
		typeof v.outputName === "string"
	);
}
