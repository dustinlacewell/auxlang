/**
 * Event types for phase-based sequencer.
 */

/**
 * A note event with position in beat units.
 */
export interface SeqEvent {
	/** Frequency to output (Hz), 0 for rest */
	freq: number;
	/** Start position in beats [0, totalBeats) */
	start: number;
	/** End position in beats (0, totalBeats] */
	end: number;
	/** Whether this is a rest (no sound) */
	isRest: boolean;
	/** Whether this event is tied from the previous (don't trigger) */
	isTiedFromPrevious: boolean;
	/** Whether this event is tied to the next (don't release gate) */
	isTiedToNext: boolean;
	/** Source position start (for visualization) */
	srcStart?: number;
	/** Source position end (for visualization) */
	srcEnd?: number;
}
