/**
 * The key an onset's "current" slot is kept under: one per (watch, lane), so
 * a chord's stacked notes each keep their own latest onset instead of
 * overwriting one another (onsets-to-lights.ts, held-onsets.ts).
 */

import type { Onset } from "./onsets-to-lights";

export function onsetLaneKey(onset: Onset): string {
	return `${onset.watch}:${onset.lane}`;
}
