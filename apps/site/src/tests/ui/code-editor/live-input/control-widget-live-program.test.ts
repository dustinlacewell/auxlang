import { carriesLiveProgram, setLiveProgram } from "@/ui/code-editor/live-input/control-widget-extension";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

describe("carriesLiveProgram", () => {
	it("is true when a transaction carries setLiveProgram, even with no doc change", () => {
		const state = EditorState.create({ doc: "x" });
		const tr = state.update({ effects: setLiveProgram.of(undefined) });
		expect(carriesLiveProgram({ transactions: [tr] })).toBe(true);
	});

	it("is false for an ordinary doc-changing transaction", () => {
		const state = EditorState.create({ doc: "x" });
		const tr = state.update({ changes: { from: 0, to: 1, insert: "y" } });
		expect(carriesLiveProgram({ transactions: [tr] })).toBe(false);
	});

	it("is false with no transactions", () => {
		expect(carriesLiveProgram({ transactions: [] })).toBe(false);
	});
});
