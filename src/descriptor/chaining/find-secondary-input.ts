import type { DeviceSpec } from "../types";

/**
 * Find the first non-default input name, used for bare signal application.
 * Returns undefined if no secondary inputs exist.
 */
export function findSecondaryInput(spec: DeviceSpec): string | undefined {
	const inputNames = Object.keys(spec.inputs);
	const nonDefault = inputNames.filter((name) => name !== spec.defaultInput);
	return nonDefault[0];
}
