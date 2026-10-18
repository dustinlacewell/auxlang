import type { ControlWidget } from "@/live-input/control-sites";
import { ControlWidgetType } from "@/live-input/control-widget-extension";
import { describe, expect, it } from "vitest";

function widgetFor(callId: number, init: number): ControlWidget {
	return {
		kind: "knob",
		call: { kind: "call", id: callId, range: { start: 0, end: 5 }, callee: "knob", args: [] },
		slots: [{ slotIndex: 0, decl: { site: callId, init }, literal: null }],
	};
}

function typeFor(widget: ControlWidget): ControlWidgetType {
	return new ControlWidgetType(
		widget,
		new Map(),
		() => false,
		() => {},
	);
}

describe("ControlWidgetType.eq", () => {
	it("is true for the same control site, even with a different value", () => {
		const a = typeFor(widgetFor(7, 0.2));
		const b = typeFor(widgetFor(7, 0.9));
		expect(a.eq(b)).toBe(true);
	});

	it("is false for a different control site", () => {
		const a = typeFor(widgetFor(7, 0.2));
		const b = typeFor(widgetFor(9, 0.2));
		expect(a.eq(b)).toBe(false);
	});

	// CodeMirror calls updateDOM only when eq is false, offering another
	// control's element: adopting it turned a toggle into a slider.
	it("never adopts another control's DOM", () => {
		const a = typeFor(widgetFor(7, 0.2));
		expect(a.updateDOM({} as HTMLElement, {} as never)).toBe(false);
	});
});
