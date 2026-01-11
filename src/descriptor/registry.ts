import type { PolyDescriptor } from "./poly";
import type { AnyDescriptor, DescriptorId, DeviceSpec, Signal } from "./types";

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
 * Takes positional args consumed in order, with optional trailing params object.
 * Returns poly when expand function creates polyphony.
 */
export type DeviceFactory = (chainedSignal?: Signal, ...args: unknown[]) => AnyDescriptor | PolyDescriptor;

/** Device registration entry - factory plus spec for polyphonic checking */
interface DeviceEntry {
	factory: DeviceFactory;
	spec: DeviceSpec;
}

/** Registry of device factories by name (for Uzu chaining) */
const deviceRegistry = new Map<string, DeviceEntry>();

/** Register a device factory by name (called by device()) */
export function registerDevice(name: string, factory: DeviceFactory, spec?: DeviceSpec): void {
	deviceRegistry.set(name, { factory, spec: spec! });
}

/** Get a device factory by name (for chaining lookups) */
export function getDeviceFactory(name: string): DeviceFactory | undefined {
	return deviceRegistry.get(name)?.factory;
}

/** Get a device spec by name (for polyphonic checking) */
export function getDeviceSpec(name: string): DeviceSpec | undefined {
	return deviceRegistry.get(name)?.spec;
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
