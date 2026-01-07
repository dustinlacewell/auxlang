import type { InputDef } from "./types";

export function inputs<K extends string>(
	defs: Record<K, number | number[]>,
): Record<K, InputDef> {
	const result = {} as Record<K, InputDef>;
	for (const [name, defaultValue] of Object.entries(defs)) {
		result[name as K] = { default: defaultValue as number | number[] };
	}
	return result;
}
