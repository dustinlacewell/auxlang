import type { PolyDescriptor } from "./poly";
import type { AnyDescriptor, DescriptorId, Signal } from "./types";

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

/**
 * Device factory - creates a new descriptor or poly instance.
 * The factory takes an optional signal for the default input.
 * Returns poly when input is an array.
 */
export type DeviceFactory = (input?: Signal) => AnyDescriptor | PolyDescriptor;

/** Registry of device factories by name (for Uzu chaining) */
const deviceRegistry = new Map<string, DeviceFactory>();

/** Register a device factory by name (called by device()) */
export function registerDevice(name: string, factory: DeviceFactory): void {
	deviceRegistry.set(name, factory);
}

/** Get a device factory by name (for chaining lookups) */
export function getDeviceFactory(name: string): DeviceFactory | undefined {
	return deviceRegistry.get(name);
}

/** Clear device registry (for testing) */
export function clearDeviceRegistry(): void {
	deviceRegistry.clear();
}

/**
 * Output handler - called when .out() is invoked on a descriptor or poly.
 * Returns void because out() is a terminal operation.
 */
export type OutputHandler = (signal: AnyDescriptor | AnyDescriptor[]) => void;

let outputHandler: OutputHandler | null = null;

/** Register the output handler (called by out.ts on load) */
export function setOutputHandler(handler: OutputHandler): void {
	outputHandler = handler;
}

/** Get the output handler (used by descriptor and poly proxies) */
export function getOutputHandler(): OutputHandler | null {
	return outputHandler;
}
