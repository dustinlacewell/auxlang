/**
 * A lambda function that generates a signal value per-sample.
 *
 * @param state - Persistent object per input (survives across samples and re-eval)
 * @param sampleRate - Typically 44100 or 48000
 * @param time - Seconds since eval started (preserved across re-eval)
 */
export type SignalLambda = (
	state: Record<string, unknown>,
	sampleRate: number,
	time: number,
) => number;
