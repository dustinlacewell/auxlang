/**
 * Type declarations for worklet globals.
 * These utilities are available in hydrated process functions.
 */

type PS = Array<{ id: number; value: number }>;

declare const poly: {
	/** Get value for a voice ID, with mono broadcast support */
	getValue(sig: PS, id: number, defaultVal: number): number;
	/** Get all voice IDs from the largest of multiple signals */
	getVoiceIds(...sigs: PS[]): number[];
	/** Sum all voice values */
	sum(sig: PS): number;
};
