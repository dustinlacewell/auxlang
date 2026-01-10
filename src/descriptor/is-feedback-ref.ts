import type { FeedbackRef } from "./types";

/**
 * Type guard for FeedbackRef.
 * Returns true if the value is a feedback reference (created by lambda inputs).
 */
export function isFeedbackRef(value: unknown): value is FeedbackRef {
	return (
		typeof value === "object" &&
		value !== null &&
		"_feedback" in value &&
		(value as FeedbackRef)._feedback === true
	);
}
