/**
 * Migration keys: a pin, else the paired old key, else the place; duplicates
 * take the first free `~k` suffix in program order.
 */

import { describe, expect, it } from "vitest";

import { migrationKeys } from "@/engine/runtime/state-keys";
import type { Identity } from "@/engine/types";

const node = (place: string, pin?: string): Identity =>
	pin === undefined
		? { kind: "k", place, upstream: "u", constants: [] }
		: { kind: "k", place, upstream: "u", constants: [], pin };

describe("migrationKeys", () => {
	it("a fresh patch keys by place, duplicates suffixed in order", () => {
		expect(migrationKeys([node("p1"), node("p2"), node("p1")], new Map())).toEqual([
			"p1",
			"p2",
			"p1~1",
		]);
	});

	it("a pin is the key", () => {
		expect(migrationKeys([node("p1", "bass")], new Map([[0, "p7"]]))).toEqual(["bass"]);
	});

	it("a paired node keeps the old key", () => {
		expect(migrationKeys([node("p9")], new Map([[0, "p1"]]))).toEqual(["p1"]);
	});

	it("an unpaired node never takes a key a paired node keeps", () => {
		const keys = migrationKeys([node("p1"), node("p2")], new Map([[1, "p1"]]));
		expect(keys).toEqual(["p1~1", "p1"]);
	});
});
