import {
	LEVEL_HITS,
	LEVEL_LAST,
	LEVEL_MAX,
	LEVEL_MIN,
	LEVEL_PEAK,
	LEVEL_STRIDE,
	type MonitorFrame,
	ONSET_FRAME,
	ONSET_KIND,
	ONSET_KIND_OFF,
	ONSET_KIND_ON,
	ONSET_LANE,
	ONSET_SITE,
	ONSET_STRIDE,
	ONSET_WATCH,
} from "auxlang/runtime/live/live-contract";
import { createFrameStore } from "@/ui/code-editor/live-display/frame-store";
import { describe, expect, it } from "vitest";

function buildFrame(site = 7, at = 48000, kind = ONSET_KIND_ON): MonitorFrame {
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
	floats[onsetBase + ONSET_LANE] = 0;
	floats[onsetBase + ONSET_KIND] = kind;
	floats[onsetBase + ONSET_SITE] = site;
	floats[onsetBase + ONSET_FRAME] = at;

	return { type: "monitor", generation: 1, frame: at, levelCount, onsetCount, buffer };
}

describe("frame store", () => {
	it("copies onsets out synchronously", () => {
		const store = createFrameStore();
		store.append(buildFrame());
		const snapshot = store.take();

		expect(snapshot.onsets).toEqual([{ watch: 1, lane: 0, kind: "on", site: 7, frame: 48000 }]);
		expect(snapshot.engineFrame).toBe(48000);
	});

	it("keeps no reference to the frame's buffer", () => {
		const store = createFrameStore();
		const frame = buildFrame();
		store.append(frame);

		// Mutate the source buffer after copying; the taken onsets must not change.
		const onsetBase = frame.levelCount * LEVEL_STRIDE;
		new Float64Array(frame.buffer)[onsetBase + ONSET_SITE] = 999;

		expect(store.take().onsets[0]?.site).toBe(7);
	});

	it("keeps every frame's onsets when several arrive before one take", () => {
		const store = createFrameStore();
		store.append(buildFrame(7, 48000));
		store.append(buildFrame(9, 48800));
		const snapshot = store.take();

		expect(snapshot.onsets.map((o) => o.site)).toEqual([7, 9]);
		expect(snapshot.engineFrame).toBe(48800);
		expect(store.take().onsets).toEqual([]);
	});

	it("reads an OFF event's kind", () => {
		const store = createFrameStore();
		store.append(buildFrame(0, 48000, ONSET_KIND_OFF));
		expect(store.take().onsets).toEqual([{ watch: 1, lane: 0, kind: "off", site: 0, frame: 48000 }]);
	});
});
