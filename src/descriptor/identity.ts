import type { DescriptorId } from "./types";

let counter = 0;

/** Generate a unique descriptor ID */
export function createDescriptorId(): DescriptorId {
	return `d${++counter}` as DescriptorId;
}

/** Reset ID counter (for testing) */
export function resetIdCounter(): void {
	counter = 0;
}
