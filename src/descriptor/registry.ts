import type { AnyDescriptor, DescriptorId } from "./types";

/** Registry of all descriptors by ID (populated during descriptor creation) */
const descriptorRegistry = new Map<DescriptorId, AnyDescriptor>();

/** Register a descriptor (called internally during creation) */
export function registerDescriptor(descriptor: AnyDescriptor): void {
	descriptorRegistry.set(descriptor._state.id, descriptor);
}

/** Clear the registry (for testing or between evaluations) */
export function clearRegistry(): void {
	descriptorRegistry.clear();
}

/** Get a descriptor by ID */
export function getDescriptor(id: DescriptorId): AnyDescriptor | undefined {
	return descriptorRegistry.get(id);
}
