/**
 * seq finds the row under its position from any remembered row: small moves
 * either way walk, long jumps search, and a row boundary belongs to the
 * later row.
 */

import "@/library/all";
import { getModule } from "@/dsp/define";
import { p } from "@/pattern/notation/template";
import { describe, expect, it } from "vitest";
import { driver } from "./helpers";

const config = { pattern: p`0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15`.ast, seed: 0, lanes: 1 };
const rowAt = (pos: number) => Math.floor(pos * 16);

/** The row seq settles on at `pos`, starting from `cursor`. */
function locate(pos: number, cursor: number): number {
	const d = driver(getModule("seq"), config);
	d.state.lastRow = cursor;
	d.step({ position: pos });
	return d.state.lastRow as number;
}

describe("seq row lookup", () => {
	it("finds the row from the row it is in", () => {
		expect(locate(0.5, 8)).toBe(8);
	});

	it("walks one row forward and one row back", () => {
		expect(locate(9 / 16, 8)).toBe(9);
		expect(locate(7.5 / 16, 8)).toBe(7);
	});

	it("searches on a jump in either direction, from any cursor", () => {
		for (const cursor of [0, 5, 15, -3, 40, Number.NaN]) {
			for (let k = 0; k < 64; k++) {
				const pos = k / 64;
				expect(locate(pos, cursor)).toBe(rowAt(pos));
			}
		}
	});

	it("puts a row boundary in the later row", () => {
		expect(locate(0.25, 0)).toBe(4);
		expect(locate(0.25, 15)).toBe(4);
	});

	it("reads the value of the row it finds", () => {
		const d = driver(getModule("seq"), config);
		expect(d.step({ position: 11.5 / 16 }).out).toBe(11);
	});
});
