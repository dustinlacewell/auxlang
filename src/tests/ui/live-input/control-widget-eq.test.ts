import type { ControlWidget } from "@/ui/core3-editor/live-input/control-sites";
import { ControlWidgetType } from "@/ui/core3-editor/live-input/control-widget-extension";
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

	it("updateDOM always reports it handled the update (no redraw) when eq holds", () => {
		const a = typeFor(widgetFor(7, 0.2));
		expect(a.updateDOM()).toBe(true);
	});
});
