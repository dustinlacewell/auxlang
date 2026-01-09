/**
 * Polyphonic signal type and helper functions.
 *
 * A PolySignal carries voice ID with each channel value, enabling:
 * - Stable voice identity (assigned at parse time)
 * - Dynamic voice count (only active voices present)
 * - State keying by voice ID instead of array index
 */

/** A single voice channel with its identity */
export interface VoiceChannel {
	readonly id: number;
	readonly value: number;
}

/** Polyphonic signal - array of voice channels */
export type PolySignal = VoiceChannel[];

/**
 * Get value for a voice ID, handling mono broadcast.
 *
 * Behavior:
 * - Empty signal: returns defaultVal
 * - Mono signal (length 1): broadcasts that value to all voices
 * - Multi-voice signal: finds matching voice ID or returns defaultVal
 */
export function getValue(sig: PolySignal, id: number, defaultVal = 0): number {
	if (sig.length === 0) return defaultVal;
	if (sig.length === 1) return sig[0]!.value; // Broadcast mono
	const voice = sig.find((v) => v.id === id);
	return voice?.value ?? defaultVal;
}

/**
 * Get all unique voice IDs across multiple signals.
 * Ignores mono signals (they broadcast to whatever voices exist).
 */
export function getActiveVoiceIds(...signals: PolySignal[]): number[] {
	const ids = new Set<number>();
	for (const sig of signals) {
		if (sig.length > 1) {
			// Skip mono (broadcast)
			for (const v of sig) ids.add(v.id);
		}
	}
	return [...ids].sort((a, b) => a - b);
}

/**
 * Build a lookup map for fast voice value access.
 * Use when iterating over many voices with the same signal.
 */
export function buildLookup(sig: PolySignal): Map<number, number> {
	return new Map(sig.map((v) => [v.id, v.value]));
}

/**
 * Create a mono (broadcast) signal from a single value.
 */
export function mono(value: number, id = 0): PolySignal {
	return [{ id, value }];
}

/**
 * Sum all channels of a poly signal to mono.
 * Uses √n normalization (sum / √n) for perceptually balanced mixing.
 */
export function sumToMono(sig: PolySignal): number {
	if (sig.length === 0) return 0;
	let sum = 0;
	for (const v of sig) sum += v.value;
	return sum / Math.sqrt(sig.length);
}

/**
 * Convert legacy number[] format to new PolySignal format.
 * Voice IDs are assigned sequentially from 0.
 */
export function fromLegacy(arr: number[]): PolySignal {
	return arr.map((value, id) => ({ id, value }));
}

/**
 * Convert new PolySignal format to legacy number[] format.
 * Assumes contiguous voice IDs starting at 0.
 * Missing IDs become 0 in the output.
 */
export function toLegacy(sig: PolySignal): number[] {
	if (sig.length === 0) return [];
	const maxId = Math.max(...sig.map((v) => v.id));
	const result = new Array<number>(maxId + 1).fill(0);
	for (const v of sig) {
		result[v.id] = v.value;
	}
	return result;
}
