/**
 * Collects MonitorFrames' ON/OFF events between two renders. `append` copies
 * a frame's events out synchronously (live-contract.ts: `onMonitor`'s
 * listener must read before it returns, because the buffer goes back to the
 * worklet right after) and holds no reference to `frame.buffer` afterwards.
 * Several frames can arrive before one animation frame renders them; `take`
 * hands over every event since the last take, so none is lost to a later
 * frame.
 */

import {
	LEVEL_STRIDE,
	type MonitorFrame,
	ONSET_FRAME,
	ONSET_KIND,
	ONSET_KIND_ON,
	ONSET_LANE,
	ONSET_SITE,
	ONSET_STRIDE,
	ONSET_WATCH,
} from "@/core3/runtime/live/live-contract";
import type { Onset } from "./onsets-to-lights";

export interface FrameSnapshot {
	readonly onsets: readonly Onset[];
	readonly engineFrame: number;
}

export interface FrameStore {
	append(frame: MonitorFrame): void;
	/** The onsets appended since the last take, and the latest frame's engine frame. */
	take(): FrameSnapshot;
}

export function createFrameStore(): FrameStore {
	const onsets: Onset[] = [];
	let engineFrame = 0;

	return {
		append(frame) {
			appendOnsets(new Float64Array(frame.buffer), frame.levelCount, frame.onsetCount, onsets);
			engineFrame = frame.frame;
		},
		take() {
			const snapshot = { onsets: onsets.slice(), engineFrame };
			onsets.length = 0;
			return snapshot;
		},
	};
}

function appendOnsets(floats: Float64Array, levelCount: number, onsetCount: number, into: Onset[]): void {
	const base0 = levelCount * LEVEL_STRIDE;
	for (let i = 0; i < onsetCount; i++) {
		const base = base0 + i * ONSET_STRIDE;
		into.push({
			watch: floats[base + ONSET_WATCH] as number,
			lane: floats[base + ONSET_LANE] as number,
			kind: floats[base + ONSET_KIND] === ONSET_KIND_ON ? "on" : "off",
			site: floats[base + ONSET_SITE] as number,
			frame: floats[base + ONSET_FRAME] as number,
		});
	}
}
