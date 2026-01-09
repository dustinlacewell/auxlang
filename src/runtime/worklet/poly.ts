/**
 * PolySignal utilities for the worklet context.
 * These are attached to globalThis.poly for use by hydrated process functions.
 */

type PS = Array<{ id: number; value: number }>;

/**
 * Get value for a voice ID from a PolySignal, handling mono broadcast.
 * Mono signals (length 1) broadcast to all voices.
 */
function getValue(sig: PS, id: number, defaultVal: number): number {
	if (sig.length === 0) return defaultVal;
	if (sig.length === 1) return sig[0]!.value;
	const v = sig.find((ch) => ch.id === id);
	return v?.value ?? defaultVal;
}

/**
 * Get all voice IDs from the largest of multiple PolySignals.
 */
function getVoiceIds(...sigs: PS[]): number[] {
	let largest: PS = [];
	for (const sig of sigs) {
		if (sig.length > largest.length) largest = sig;
	}
	return largest.map((ch) => ch.id);
}

/**
 * Sum all voice values in a PolySignal.
 */
function sum(sig: PS): number {
	let total = 0;
	for (const ch of sig) {
		total += ch.value;
	}
	return total;
}

// Attach to globalThis as a side effect (runs when module is imported)
// biome-ignore lint/suspicious/noExplicitAny: worklet global injection
(globalThis as any).poly = {
	getValue,
	getVoiceIds,
	sum,
};
