/**
 * locate: the row under a position, from any cursor — small moves either way
 * walk, long jumps search, and positions off the table clamp.
 */

import { p } from "@/core3/pattern/notation/template";
import { createTable } from "@/core3/pattern/table/event-table";
import { fillTable } from "@/core3/pattern/table/fill-table";
import { locate } from "@/core3/pattern/table/locate";
import { describe, expect, it } from "vitest";

const t = createTable();
fillTable(p`0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15`.ast, 0, 0, 0, t);
const rowAt = (pos: number) => Math.floor(pos * 16);

describe("locate", () => {
	it("finds the row from the row it is in", () => {
		expect(locate(t, 0.5, 8)).toBe(8);
	});

	it("walks one row forward and one row back", () => {
		expect(locate(t, 9 / 16, 8)).toBe(9);
		expect(locate(t, 7.5 / 16, 8)).toBe(7);
	});

	it("searches on a jump in either direction, from any cursor", () => {
		for (const cursor of [0, 5, 15, -3, 40, Number.NaN]) {
			for (let k = 0; k < 64; k++) {
				const pos = k / 64;
				expect(locate(t, pos, cursor)).toBe(rowAt(pos));
			}
		}
	});

	it("puts a row boundary in the later row", () => {
		expect(locate(t, 0.25, 0)).toBe(4);
		expect(locate(t, 0.25, 15)).toBe(4);
	});

	it("clamps positions off the table", () => {
		expect(locate(t, -1, 8)).toBe(0);
		expect(locate(t, 5, 8)).toBe(15);
	});
});
