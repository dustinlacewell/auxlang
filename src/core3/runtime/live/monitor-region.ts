/**
 * The monitor region: where an engine accumulates one monitor frame
 * (live-contract.ts), as f64 words. In the WASM engine it lives in the
 * instance's memory (wasm/program/memory-layout.ts); the interpreted
 * monitor (interpreted-monitor.ts) keeps its own array. Words:
 *
 *   frame    the sample frame of the next sample; the engine adds 1 per
 *            sample, the host sets it before a block (the worklet: the
 *            AudioContext frame, so onsets line up with `audibleFrame`)
 *   onsets   how many onsets the frame holds
 *   levels   LEVEL_STRIDE words per watch
 *   onsets   ONSET_CAPACITY entries of ONSET_STRIDE words
 *
 * A frame starts with min +Infinity, max -Infinity, peak 0, hits 0 and no
 * onsets; `last` runs on across frames, so an edge that crosses a frame
 * boundary still counts once.
 */

import {
	LEVEL_HITS,
	LEVEL_LAST,
	LEVEL_MAX,
	LEVEL_MIN,
	LEVEL_PEAK,
	LEVEL_STRIDE,
	ONSET_CAPACITY,
	ONSET_STRIDE,
} from "./live-contract";

export const REGION_FRAME = 0;
export const REGION_ONSETS = 1;
export const REGION_LEVELS = 2;

/** A region inside an f64 array: its first word and its watch count. */
export interface MonitorRegion {
	readonly f64: Float64Array;
	readonly at: number;
	readonly watches: number;
}

/** Words a region of `watches` watches takes. */
export function regionWords(watches: number): number {
	return REGION_LEVELS + frameWords(watches);
}

/** Words of a posted frame (MonitorFrame.buffer): the levels, then the onsets. */
export function frameWords(watches: number): number {
	return watches * LEVEL_STRIDE + ONSET_CAPACITY * ONSET_STRIDE;
}

/** The region's first onset word, relative to the region. */
export function onsetsStart(watches: number): number {
	return REGION_LEVELS + watches * LEVEL_STRIDE;
}

/** A fresh region: frame 0, every `last` 0, a frame started. */
export function initRegion(region: MonitorRegion): void {
	const { f64, at, watches } = region;
	f64[at + REGION_FRAME] = 0;
	for (let w = 0; w < watches; w++) f64[at + REGION_LEVELS + w * LEVEL_STRIDE + LEVEL_LAST] = 0;
	startFrame(region);
}

/** Start a frame: the summaries reset, the onsets cleared; `last` and the frame run on. */
export function startFrame(region: MonitorRegion): void {
	const { f64, at, watches } = region;
	f64[at + REGION_ONSETS] = 0;
	for (let w = 0; w < watches; w++) {
		const level = at + REGION_LEVELS + w * LEVEL_STRIDE;
		f64[level + LEVEL_MIN] = Number.POSITIVE_INFINITY;
		f64[level + LEVEL_MAX] = Number.NEGATIVE_INFINITY;
		f64[level + LEVEL_PEAK] = 0;
		f64[level + LEVEL_HITS] = 0;
	}
}

/** The frame of the next sample. */
export function setRegionFrame(region: MonitorRegion, frame: number): void {
	region.f64[region.at + REGION_FRAME] = frame;
}

/** Copy the frame into `into` (frameWords long): levels, then the kept onsets. Returns the onset count. */
export function copyFrame(region: MonitorRegion, into: Float64Array): number {
	const { f64, at, watches } = region;
	const levels = watches * LEVEL_STRIDE;
	for (let k = 0; k < levels; k++) into[k] = f64[at + REGION_LEVELS + k] as number;
	const count = f64[at + REGION_ONSETS] as number;
	const from = at + onsetsStart(watches);
	for (let k = 0; k < count * ONSET_STRIDE; k++) into[levels + k] = f64[from + k] as number;
	return count;
}
