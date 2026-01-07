import type { OutputRef } from "./types";

export function isOutputRef(value: unknown): value is OutputRef {
	return (
		typeof value === "object" && value !== null && "descriptorId" in value && "outputName" in value
	);
}
