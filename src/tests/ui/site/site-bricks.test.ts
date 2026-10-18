import "@/engine/modules/all";

import { describe, expect, it } from "vitest";

import { evalPatch } from "@/engine/eval-patch";
import { CHAPTERS as GUIDE } from "@/ui/site/guide/bricks";
import { CHAPTERS as DSP } from "@/ui/site/module-dsp/bricks";

describe("site bricks", () => {
	for (const [page, CHAPTERS] of [
		["guide", GUIDE],
		["module dsp", DSP],
	] as const) {
		describe(page, () => {
			for (const chapter of CHAPTERS) {
				describe(chapter.title, () => {
					chapter.bricks.forEach((brick, i) => {
						const n = i + 1;
						if (brick.throws) {
							it(`brick ${n} throws`, () => {
								expect(() => evalPatch(brick.code)).toThrow();
							});
						} else {
							it(`brick ${n} evaluates without throwing`, () => {
								expect(() => evalPatch(brick.code)).not.toThrow();
							});
						}
					});
				});
			}
		});
	}
});
