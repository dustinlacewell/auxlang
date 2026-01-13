/**
 * Device registry - stores device specs and factories by name.
 */

import type { DeviceSpec } from "./device-spec";

export type DeviceFactory = (...args: unknown[]) => unknown;

interface RegistryEntry {
	factory: DeviceFactory;
	spec: DeviceSpec;
}

const deviceRegistry = new Map<string, RegistryEntry>();

export function registerDevice(name: string, factory: DeviceFactory, spec: DeviceSpec): void {
	deviceRegistry.set(name, { factory, spec });
}

export function getDeviceFactory(name: string): DeviceFactory | undefined {
	return deviceRegistry.get(name)?.factory;
}

export function getDeviceSpec(name: string): DeviceSpec | undefined {
	return deviceRegistry.get(name)?.spec;
}

export function clearRegistry(): void {
	deviceRegistry.clear();
}
