/**
 * Type declarations for worklet globals.
 * These utilities are available in hydrated process functions.
 */

// Seq traversal utilities (attached to globalThis)
declare const seqTraverse: {
	traverseMono(
		expr: unknown,
		time: { beatIndex: number; phase: number; cycle: number; totalBeats: number },
		state: unknown,
	): { cv: number; gate: number; trig: number };
	createMonoTraversalState(): unknown;
	clearMonoProbDecisions(state: unknown): void;
};
