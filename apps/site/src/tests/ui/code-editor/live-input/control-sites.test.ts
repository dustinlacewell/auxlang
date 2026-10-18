import { controlWidgetsOf } from "@/ui/code-editor/live-input/control-sites";
import type { SourceMap } from "auxlang/source/source-map";
import type { SlotDecl } from "auxlang/runtime/live/live-contract";
import { describe, expect, it } from "vitest";

function sourceMapWith(calls: SourceMap["sites"]): SourceMap {
	return { sites: calls };
}

describe("controlWidgetsOf", () => {
	it("joins a slider's one slot to its call by site", () => {
		const sourceMap = sourceMapWith([
			{
				kind: "call",
				id: 3,
				range: { start: 0, end: 10 },
				callee: "slider",
				args: [{ site: 99, value: 0.5 }],
			},
		]);
		const slots: SlotDecl[] = [{ site: 3, init: 0.5 }];

		const widgets = controlWidgetsOf(sourceMap, slots);
		expect(widgets).toHaveLength(1);
		expect(widgets[0]?.kind).toBe("slider");
		expect(widgets[0]?.slots).toHaveLength(1);
		expect(widgets[0]?.slots[0]?.slotIndex).toBe(0);
	});

	it("joins xy's two slots (call + 0, call + 0.5) to the same widget, x before y", () => {
		const sourceMap = sourceMapWith([
			{ kind: "call", id: 7, range: { start: 0, end: 20 }, callee: "xy", args: [] },
		]);
		const slots: SlotDecl[] = [
			{ site: 7.5, init: 0.2 },
			{ site: 7, init: 0.1 },
		];

		const widgets = controlWidgetsOf(sourceMap, slots);
		expect(widgets).toHaveLength(1);
		expect(widgets[0]?.slots.map((s) => s.slotIndex)).toEqual([1, 0]);
	});

	it("ignores slots whose call is not a control", () => {
		const sourceMap = sourceMapWith([
			{ kind: "call", id: 1, range: { start: 0, end: 5 }, callee: "lpf", args: [] },
		]);
		const slots: SlotDecl[] = [{ site: 1, init: 0 }];
		expect(controlWidgetsOf(sourceMap, slots)).toEqual([]);
	});
});
