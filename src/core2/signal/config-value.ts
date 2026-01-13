/**
 * A config value - data passed to device config (not modulatable signals).
 *
 * Can be plain data or a function that's called during processing.
 */
// biome-ignore lint/suspicious/noExplicitAny: config can hold any data
// biome-ignore lint/complexity/noBannedTypes: object is intentionally broad
export type ConfigValue =
	| number
	| string
	| boolean
	| null
	| object
	| ((...args: any[]) => any);
