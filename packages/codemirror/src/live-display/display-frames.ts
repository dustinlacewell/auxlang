/**
 * Copies each display's lane buffers out of a monitor frame's third section
 * (monitor-region.ts header; live-contract.ts `DisplayWatch`) into per-site,
 * per-lane arrays the editor keeps across frames — reusing an existing array
 * when its length still matches, so a steady display allocates nothing.
 */

import type { DisplayWatch } from "auxlang/runtime/live/live-contract";
import { frameWords } from "auxlang/runtime/live/monitor-region";

export function readDisplays(
	words: Float64Array,
	levelCount: number,
	displays: readonly DisplayWatch[],
	into: Map<number, Float64Array[]>,
): void {
	let at = frameWords(levelCount);
	for (const display of displays) {
		const lanes = into.get(display.site) ?? [];
		for (let lane = 0; lane < display.lanes; lane++) {
			const n = words[at + 1] as number;
			const length = 2 + n;
			let buf = lanes[lane];
			if (buf === undefined || buf.length !== length) {
				buf = new Float64Array(length);
				lanes[lane] = buf;
			}
			for (let k = 0; k < length; k++) buf[k] = words[at + k] as number;
			at += length;
		}
		into.set(display.site, lanes);
	}
}
