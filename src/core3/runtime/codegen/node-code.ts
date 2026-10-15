/**
 * The generated code for one node, in the four places a block driver has:
 * the unit's prologue (run once, when the unit's factory makes the driver
 * function: per-lane instances of ticks or helpers that keep math call
 * caches), before the sample loop (load state into locals), inside it (one
 * sample of the node, every lane), and after it (store state back).
 */

export interface NodeCode {
	readonly prologue: readonly string[];
	readonly before: readonly string[];
	readonly sample: readonly string[];
	readonly after: readonly string[];
}
