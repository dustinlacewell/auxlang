/**
 * A set of helpers that call each other by name: one module's helpers,
 * auxlang's math library, or the runtime functions. `cached`: the set's
 * helpers use the module's math call cache, so each takes the lane's cache
 * address as a hidden first parameter.
 */
export interface HelperSet {
	/** Names the set in errors and keys its compiled functions. */
	readonly owner: string;
	readonly texts: Readonly<Record<string, string>>;
	readonly cached: boolean;
}

export function helperSet(owner: string, texts: Readonly<Record<string, string>>): HelperSet {
	return { owner, texts, cached: Object.values(texts).some((t) => t.includes("__mc[")) };
}
