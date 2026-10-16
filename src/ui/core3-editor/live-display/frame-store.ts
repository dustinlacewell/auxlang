/**
 * Copies one MonitorFrame's onsets out synchronously (live-contract.ts:
 * `onMonitor`'s listener must read before it returns, because the buffer goes
 * back to the worklet right after). Holds no reference to `frame.buffer`
 * afterwards — the onsets live in a plain array the store owns and reuses
 * frame to frame, so reading the monitor allocates nothing per frame.
 */

import {
	LEVEL_STRIDE,
	type MonitorFrame,
	ONSET_FRAME,
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
	copyFrom(frame: MonitorFrame): FrameSnapshot;
}

export function createFrameStore(): FrameStore {
	let onsets: Onset[] = [];

	return {
		copyFrom(frame) {
			const floats = new Float64Array(frame.buffer);
			onsets = copyOnsets(floats, frame.levelCount, frame.onsetCount, onsets);
			return { onsets, engineFrame: frame.frame };
		},
	};
}

function copyOnsets(
	floats: Float64Array,
	levelCount: number,
	onsetCount: number,
	reuse: Onset[],
): Onset[] {
	const base0 = levelCount * LEVEL_STRIDE;
	const out = reuse.length === onsetCount ? reuse : new Array<Onset>(onsetCount);
	for (let i = 0; i < onsetCount; i++) {
		const base = base0 + i * ONSET_STRIDE;
		out[i] = {
			watch: floats[base + ONSET_WATCH] as number,
			site: floats[base + ONSET_SITE] as number,
			frame: floats[base + ONSET_FRAME] as number,
		};
	}
	return out;
}
