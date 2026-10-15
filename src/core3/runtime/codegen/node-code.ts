/**
 * The generated code for one node, in the three places a block driver has:
 * before the sample loop (load state into locals), inside it (one sample of
 * the node, every lane), and after it (store state back).
 */

export interface NodeCode {
	readonly before: readonly string[];
	readonly sample: readonly string[];
	readonly after: readonly string[];
}
