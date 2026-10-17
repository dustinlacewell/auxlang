import "@/core3/modules/all";

import { describe, expect, it } from "vitest";

import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { CHAPTERS } from "@/ui/site/guide/bricks";

describe("guide bricks", () => {
	for (const chapter of CHAPTERS) {
		describe(chapter.title, () => {
			chapter.bricks.forEach((brick, i) => {
				const n = i + 1;
				if (chapter.title === "When it breaks" && brick.code.includes("ptich")) {
					it(`brick ${n} throws naming the pitch port`, () => {
						expect(() => evalPatch(brick.code)).toThrow(/pitch/);
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
