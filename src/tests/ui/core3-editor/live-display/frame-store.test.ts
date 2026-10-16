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
import { createFrameStore } from "@/ui/core3-editor/live-display/frame-store";
import { describe, expect, it } from "vitest";

function buildFrame(): MonitorFrame {
	const levelCount = 2;
	const onsetCount = 1;
	const buffer = new ArrayBuffer((levelCount * LEVEL_STRIDE + onsetCount * ONSET_STRIDE) * 8);
	const floats = new Float64Array(buffer);

	floats[0 * LEVEL_STRIDE + LEVEL_LAST] = 0.5;
	floats[0 * LEVEL_STRIDE + LEVEL_MIN] = 0;
	floats[0 * LEVEL_STRIDE + LEVEL_MAX] = 1;
	floats[0 * LEVEL_STRIDE + LEVEL_PEAK] = 0.9;
	floats[0 * LEVEL_STRIDE + LEVEL_HITS] = 1;

	floats[1 * LEVEL_STRIDE + LEVEL_LAST] = -0.25;
	floats[1 * LEVEL_STRIDE + LEVEL_MIN] = -1;
	floats[1 * LEVEL_STRIDE + LEVEL_MAX] = 1;
	floats[1 * LEVEL_STRIDE + LEVEL_PEAK] = 0.3;
	floats[1 * LEVEL_STRIDE + LEVEL_HITS] = 0;

	const onsetBase = levelCount * LEVEL_STRIDE;
	floats[onsetBase + ONSET_WATCH] = 1;
	floats[onsetBase + ONSET_SITE] = 7;
	floats[onsetBase + ONSET_FRAME] = 48000;

	return { type: "monitor", generation: 1, frame: 48000, levelCount, onsetCount, buffer };
}

describe("frame store", () => {
	it("copies onsets out synchronously", () => {
		const store = createFrameStore();
		const snapshot = store.copyFrom(buildFrame());

		expect(snapshot.onsets).toEqual([{ watch: 1, site: 7, frame: 48000 }]);
		expect(snapshot.engineFrame).toBe(48000);
	});

	it("keeps no reference to the frame's buffer", () => {
		const store = createFrameStore();
		const frame = buildFrame();
		const snapshot = store.copyFrom(frame);

		// Mutate the source buffer after copying; the snapshot's onsets must not change.
		const onsetBase = frame.levelCount * LEVEL_STRIDE;
		new Float64Array(frame.buffer)[onsetBase + ONSET_SITE] = 999;

		expect(snapshot.onsets[0]?.site).toBe(7);
	});
});
