/**
 * `lowerModule` end to end: the echo example (MANIFESTO §5, the card's
 * shape-C sample) lowers to a `LoweredModule` whose ports, writes and
 * origins match the written text, and whose `source` is a valid
 * `ModuleSource` shape.
 *
 * `bindSource` is not wired to accept `__dsp_`-prefixed internal text yet
 * (card step 4): `bindModuleMath`'s `assertNoLibraryNames` runs on every
 * `ModuleSource.tick` unconditionally and rejects the `__dsp_` names this
 * step's `LIBRARY_PREFIXES` addition reserves, so a shape-C lowering is not
 * yet accepted by today's `bindSource`. The second test below records that
 * exact, current behavior rather than asserting a pass that isn't true yet.
 */

import { describe, expect, it } from "vitest";

import { bindSource } from "@/core3/module/bind-module";
import { fileProgram } from "@/core3/module/lower/file-program";
import { lowerModule } from "@/core3/module/lower/lower-module";
import type { SourceText } from "@/core3/module/source-text";

const FILE_TEXT = [
	"function wrapIndex(k, n) { return ((Math.floor(k) % n) + n) % n }",
	"",
	'defmod("echo", { cat: "effects" }, ({ sr }) => {',
	"  const buf = new Float64Array(sr)",
	"  let w = 0",
	"  return ({ in: x = 0, time = secs(0.25) }) => {",
	"    const y = x + buf[wrapIndex(w - time * sr, buf.length)] * 0.5",
	"    buf[w] = y; w = (w + 1) % buf.length",
	"    return y",
	"  }",
	"})",
].join("\n");

const SETUP_TEXT = [
	"({ sr }) => {",
	"  const buf = new Float64Array(sr)",
	"  let w = 0",
	"  return ({ in: x = 0, time = secs(0.25) }) => {",
	"    const y = x + buf[wrapIndex(w - time * sr, buf.length)] * 0.5",
	"    buf[w] = y; w = (w + 1) % buf.length",
	"    return y",
	"  }",
	"}",
].join("\n");

function lowerEcho() {
	const source: SourceText = { file: "patch", text: FILE_TEXT };
	const program = fileProgram(source);
	return lowerModule({
		name: "echo",
		meta: { cat: "effects" },
		setupText: SETUP_TEXT,
		file: { text: FILE_TEXT, program },
		library: false,
	});
}

describe("lowerModule", () => {
	it("the echo example end to end", () => {
		const lowered = lowerEcho();

		expect(Object.keys(lowered.ins)).toEqual(["in", "time"]);
		expect(Object.keys(lowered.outs)).toEqual(["out"]);
		expect(lowered.defaultIn).toBe("in");
		expect(lowered.positional).toEqual(["time"]);
		expect([...lowered.writes].sort()).toEqual(["buf", "w"]);

		// `defmod(` is at line 3; the tick arrow it returns starts at line 6.
		expect(lowered.source.origins?.tick).toEqual({ file: "patch", line: 6 });
		expect(lowered.source.helpers.wrapIndex).toBeDefined();
	});

	it("feeding `source` into today's bindSource: not yet accepted (card step 4 wires this)", () => {
		const lowered = lowerEcho();
		const spec = {
			name: lowered.name,
			category: lowered.category,
			ins: lowered.ins,
			outs: lowered.outs,
			defaultIn: lowered.defaultIn as string,
			...(lowered.defaultOut !== undefined ? { defaultOut: lowered.defaultOut } : {}),
			positional: lowered.positional ?? [],
			config: lowered.config ?? {},
			tick: (() => {}) as never,
		};

		expect(() => bindSource(spec, lowered.source, "first use")).toThrow(/__dsp_/);
	});
});
