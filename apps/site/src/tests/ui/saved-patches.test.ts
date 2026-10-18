import {
	createSavedPatch,
	createUntitledSavedPatch,
	listSavedPatches,
	removeSavedPatch,
	renameSavedPatch,
	updateSavedPatchSource,
} from "@/ui/editor/storage/saved-patches";
import { beforeEach, describe, expect, it, vi } from "vitest";

function fakeLocalStorage() {
	const store = new Map<string, string>();
	return {
		getItem: (key: string) => store.get(key) ?? null,
		setItem: (key: string, value: string) => store.set(key, value),
		removeItem: (key: string) => store.delete(key),
		clear: () => store.clear(),
	};
}

beforeEach(() => {
	// @ts-expect-error -- test double for the browser global.
	globalThis.localStorage = fakeLocalStorage();
	// @ts-expect-error -- crypto.randomUUID stub for Node's test env.
	globalThis.crypto ??= {};
	globalThis.crypto.randomUUID ??= () =>
		Math.random().toString(36).slice(2) as ReturnType<Crypto["randomUUID"]>;
	let tick = 0;
	vi.spyOn(Date, "now").mockImplementation(() => ++tick);
});

describe("saved patches", () => {
	it("starts empty", () => {
		expect(listSavedPatches()).toEqual([]);
	});

	it("round-trips create, rename, update, remove", () => {
		const created = createSavedPatch("my patch", "tempo(120)");
		expect(listSavedPatches()).toHaveLength(1);
		expect(listSavedPatches()[0]).toMatchObject({ name: "my patch", source: "tempo(120)" });

		renameSavedPatch(created.id, "renamed");
		expect(listSavedPatches()[0]?.name).toBe("renamed");

		updateSavedPatchSource(created.id, "tempo(140)");
		expect(listSavedPatches()[0]?.source).toBe("tempo(140)");

		removeSavedPatch(created.id);
		expect(listSavedPatches()).toEqual([]);
	});

	it("lists newest edit first", () => {
		const a = createSavedPatch("a", "// a");
		const b = createSavedPatch("b", "// b");
		updateSavedPatchSource(a.id, "// a updated");
		void b;
		const names = listSavedPatches().map((p) => p.name);
		expect(names.indexOf("a")).toBeLessThan(names.indexOf("b"));
	});

	it("ignores unknown ids", () => {
		expect(() => renameSavedPatch("missing", "x")).not.toThrow();
		expect(() => updateSavedPatchSource("missing", "x")).not.toThrow();
		expect(() => removeSavedPatch("missing")).not.toThrow();
	});

	it("dedupes untitled patch names", () => {
		const first = createUntitledSavedPatch("// 1");
		const second = createUntitledSavedPatch("// 2");
		const third = createUntitledSavedPatch("// 3");
		expect(first.name).toBe("untitled patch");
		expect(second.name).toBe("untitled patch 2");
		expect(third.name).toBe("untitled patch 3");
	});
});
