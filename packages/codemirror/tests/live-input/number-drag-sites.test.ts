import { draggableNumbersOf, numberSiteAt } from "@/live-input/number-drag-sites";
import type { SourceMap } from "auxlang/source/source-map";
import type { SlotDecl } from "auxlang/runtime/live/live-contract";
import { describe, expect, it } from "vitest";

describe("draggableNumbersOf", () => {
	const doc = "sin(440).out()";
	const sourceMap: SourceMap = {
		sites: [{ kind: "number", id: 2, range: { start: 4, end: 7 }, value: 440 }],
	};

	it("lists every number site with no slot bound yet", () => {
		const numbers = draggableNumbersOf(doc, sourceMap, []);
		expect(numbers).toEqual([{ site: 2, text: "440", range: { start: 4, end: 7 }, slotIndex: null }]);
	});

	it("resolves a literal's slot index once bound", () => {
		const slots: SlotDecl[] = [{ site: 2, init: 440 }];
		const numbers = draggableNumbersOf(doc, sourceMap, slots);
		expect(numbers[0]?.slotIndex).toBe(0);
	});

	it("does not bind a control slot's fractional site to a literal", () => {
		const slots: SlotDecl[] = [{ site: 2.5, init: 0 }];
		const numbers = draggableNumbersOf(doc, sourceMap, slots);
		expect(numbers[0]?.slotIndex).toBeNull();
	});
});

describe("numberSiteAt", () => {
	it("finds the number whose range contains the position", () => {
		const numbers = [{ site: 2, text: "440", range: { start: 4, end: 7 }, slotIndex: null }];
		expect(numberSiteAt(numbers, 5)?.site).toBe(2);
		expect(numberSiteAt(numbers, 20)).toBeNull();
	});
});
