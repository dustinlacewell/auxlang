/**
 * Copies one MonitorFrame's numbers out synchronously (live-contract.ts:
 * `onMonitor`'s listener must read before it returns, because the buffer goes
 * back to the worklet right after). Holds no reference to `frame.buffer`
 * afterwards — the levels and onsets live in plain arrays the store owns and
 * reuses frame to frame, so reading the monitor allocates nothing per frame.
 */

import {
	LEVEL_HITS,
	LEVEL_LAST,
	LEVEL_MAX,
	LEVEL_MIN,
	LEVEL_PEAK,
	LEVEL_STRIDE,
	type MonitorFrame,
	ONSET_FRAME,
	ONSET_SITE,
	ONSET_STRIDE,
	ONSET_WATCH,
} from "@/core3/runtime/live/live-contract";
import type { Levels } from "./glow-state";
import type { Onset } from "./onsets-to-lights";

export interface FrameSnapshot {
	/** Levels by watch index, length === watches.length. */
	readonly levels: readonly Levels[];
	readonly onsets: readonly Onset[];
	readonly engineFrame: number;
}

export interface FrameStore {
	copyFrom(frame: MonitorFrame): FrameSnapshot;
}

export function createFrameStore(): FrameStore {
	let levels: Levels[] = [];
	let onsets: Onset[] = [];

	return {
		copyFrom(frame) {
			const floats = new Float64Array(frame.buffer);
			levels = copyLevels(floats, frame.levelCount, levels);
			onsets = copyOnsets(floats, frame.levelCount, frame.onsetCount, onsets);
			return { levels, onsets, engineFrame: frame.frame };
		},
	};
}

function copyLevels(floats: Float64Array, count: number, reuse: Levels[]): Levels[] {
	const out = reuse.length === count ? reuse : new Array<Levels>(count);
	for (let i = 0; i < count; i++) {
		const base = i * LEVEL_STRIDE;
		out[i] = {
			last: floats[base + LEVEL_LAST] as number,
			min: floats[base + LEVEL_MIN] as number,
			max: floats[base + LEVEL_MAX] as number,
			peak: floats[base + LEVEL_PEAK] as number,
			hits: floats[base + LEVEL_HITS] as number,
		};
	}
	return out;
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
