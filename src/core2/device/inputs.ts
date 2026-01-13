/**
 * Helper to create input definitions with defaults.
 */

import type { InputDef } from "./input-def";

export function inputs(defs: Record<string, number | number[]>): Record<string, InputDef> {
	const result: Record<string, InputDef> = {};
	for (const [name, defaultValue] of Object.entries(defs)) {
		result[name] = { default: defaultValue };
	}
	return result;
}
