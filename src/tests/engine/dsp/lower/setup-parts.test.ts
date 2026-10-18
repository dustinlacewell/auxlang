/**
 * `setupParts` pulls a setup's params, locals and tick arrow apart: params
 * split into `sr`, `width` and literal-default config keys; locals are the
 * setup body's top-level declared names; the tick is the final `return`'s
 * arrow, or a loud error naming the fix.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/engine/dsp/lower/file-program";
import { findSetup } from "@/engine/dsp/lower/find-setup";
import { setupParts } from "@/engine/dsp/lower/setup-parts";
import type { SourceText } from "@/engine/dsp/source-text";

function parseSetup(setupText: string) {
	const text = `defmod("echo", {}, ${setupText})`;
	const source: SourceText = { file: "patch", text };
	const program = fileProgram(source);
	const found = findSetup(program, text, setupText);
	if (found === null) throw new Error("test setup: findSetup found nothing");
	return found.setup;
}

describe("setupParts", () => {
	it("the echo example: sr, config default, locals, tick", () => {
		const setupText = [
			"({ sr, taps = 3 }) => {",
			"  const buf = new Float64Array(sr)",
			"  let w = 0",
			"  return ({ in: x = 0, time = secs(0.25), fm = NaN, cv }) => {",
			"    const y = x + buf[w] * 0.5",
			"    buf[w] = y; w = (w + 1) % buf.length",
			"    return y",
			"  }",
			"}",
		].join("\n");
		const setup = parseSetup(setupText);
		const parts = setupParts(setup as never, "module 'echo'");

		expect(parts.params).toEqual({ sr: true, width: false, config: [{ name: "taps", def: 3 }] });
		expect(parts.locals).toEqual(["buf", "w"]);
		expect(parts.tick.type).toBe("ArrowFunctionExpression");
	});

	it("missing a final 'return arrow' throws", () => {
		const setupText = "({ sr }) => {\n  const buf = 1\n}";
		const setup = parseSetup(setupText);
		expect(() => setupParts(setup as never, "module 'bad'")).toThrow(/must end with/);
	});
});
