import { heldOnsets } from "@/ui/code-editor/live-display/held-onsets";
import { describe, expect, it } from "vitest";

describe("heldOnsets", () => {
	it("keeps an onset that arrived before it was audible until it is", () => {
		const c3 = { watch: 0, lane: 0, kind: "on" as const, site: 0, frame: 1000 };
		const afterFirstFrame = heldOnsets([], [c3], 800);
		expect(afterFirstFrame).toEqual([c3]);
		const afterEmptyFrame = heldOnsets(afterFirstFrame, [], 1200);
		expect(afterEmptyFrame).toEqual([c3]);
	});

	it("drops an audible onset once a later one on the same watch and lane is audible", () => {
		const c3 = { watch: 0, lane: 0, kind: "on" as const, site: 0, frame: 1000 };
		const e3 = { watch: 0, lane: 0, kind: "on" as const, site: 2, frame: 2000 };
		expect(heldOnsets([c3], [e3], 1500)).toEqual([c3, e3]);
		expect(heldOnsets([c3, e3], [], 2500)).toEqual([e3]);
	});

	it("keeps each watch's current onset separately", () => {
		const a = { watch: 0, lane: 0, kind: "on" as const, site: 0, frame: 1000 };
		const b = { watch: 1, lane: 0, kind: "on" as const, site: 5, frame: 500 };
		expect(heldOnsets([a, b], [], 3000)).toEqual([a, b]);
	});

	it("keeps each lane of a chord's current onset separately, same watch", () => {
		const lane0 = { watch: 0, lane: 0, kind: "on" as const, site: 0, frame: 1000 };
		const lane1 = { watch: 0, lane: 1, kind: "on" as const, site: 2, frame: 1000 };
		expect(heldOnsets([], [lane0, lane1], 3000)).toEqual([lane0, lane1]);
	});

	it("keeps an OFF as the lane's current event once it supersedes the ON", () => {
		const on = { watch: 0, lane: 0, kind: "on" as const, site: 0, frame: 1000 };
		const off = { watch: 0, lane: 0, kind: "off" as const, site: 0, frame: 2000 };
		expect(heldOnsets([on], [off], 2500)).toEqual([off]);
	});
});
