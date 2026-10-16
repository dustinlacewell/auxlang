/**
 * Checker accepts ⇔ WASM compiles: the front end (module/front/) is the only
 * judge of tick code, so the compiler has no user-facing failure. Every
 * failure in wasm/compile goes through compilerBug (compiler-bug.ts), which
 * names it a compiler bug.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { compilerBug } from "@/core3/wasm/compile/compiler-bug";

const COMPILE_DIR = join(__dirname, "../../../core3/wasm/compile");

describe("wasm compile failures", () => {
	it("throw only through compilerBug", () => {
		const throwing = readdirSync(COMPILE_DIR)
			.filter((file) => file.endsWith(".ts") && file !== "compiler-bug.ts")
			.filter((file) => /\bthrow\b/.test(readFileSync(join(COMPILE_DIR, file), "utf8")));
		expect(throwing).toEqual([]);
	});

	it("name themselves a compiler bug", () => {
		expect(() => compilerBug("defmod('t') line 3", "no plan")).toThrow(
			"wasm compiler bug: defmod('t') line 3: no plan",
		);
	});
});
