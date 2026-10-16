/**
 * `tickWrites` finds the setup locals a tick writes: assigned, updated, the
 * root of an assigned member target, passed as a call argument, or
 * aliased. A read-only reference, or a shadowed tick local of the same
 * name, does not count.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/core3/module/lower/file-program";
import { findSetup } from "@/core3/module/lower/find-setup";
import { setupParts } from "@/core3/module/lower/setup-parts";
import { tickWrites } from "@/core3/module/lower/tick-writes";
import type { SourceText } from "@/core3/module/source-text";

function lowerTick(setupBody: string, setupLocals: readonly string[]) {
	const fileText = `defmod("m", {}, ${setupBody})`;
	const source: SourceText = { file: "patch", text: fileText };
	const program = fileProgram(source);
	const found = findSetup(program, fileText, setupBody);
	if (found === null) throw new Error("test setup: findSetup found nothing");
	const parts = setupParts(found.setup, "module 'm'");
	return tickWrites(parts.tick, new Set(setupLocals));
}

describe("tickWrites", () => {
	it("assignment `w = ...` counts", () => {
		const writes = lowerTick(
			["({ sr }) => {", "  let w = 0", "  return ({ in: x = 0 }) => {", "    w = x", "    return w", "  }", "}"].join(
				"\n",
			),
			["w"],
		);
		expect(writes.has("w")).toBe(true);
	});

	it("update `w++` counts", () => {
		const writes = lowerTick(
			["({ sr }) => {", "  let w = 0", "  return ({ in: x = 0 }) => {", "    w++", "    return w", "  }", "}"].join(
				"\n",
			),
			["w"],
		);
		expect(writes.has("w")).toBe(true);
	});

	it("an element write `buf[w] = ...` counts the root `buf`", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  let w = 0",
				"  return ({ in: x = 0 }) => {",
				"    buf[w] = x",
				"    return x",
				"  }",
				"}",
			].join("\n"),
			["buf", "w"],
		);
		expect(writes.has("buf")).toBe(true);
	});

	it("a compound member write `rec.x += ...` counts the root `rec`", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const rec = { x: 0 }",
				"  return ({ in: x = 0 }) => {",
				"    rec.x += x",
				"    return rec.x",
				"  }",
				"}",
			].join("\n"),
			["rec"],
		);
		expect(writes.has("rec")).toBe(true);
	});

	it("passed as a call argument `f(buf)` counts", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  return ({ in: x = 0 }) => {",
				"    fill(buf)",
				"    return buf[0]",
				"  }",
				"}",
			].join("\n"),
			["buf"],
		);
		expect(writes.has("buf")).toBe(true);
	});

	it("an alias `const b = buf` counts", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  return ({ in: x = 0 }) => {",
				"    const b = buf",
				"    return b[0]",
				"  }",
				"}",
			].join("\n"),
			["buf"],
		);
		expect(writes.has("buf")).toBe(true);
	});

	it("a read-only `buf.length` does not count", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  return ({ in: x = 0 }) => {",
				"    return buf.length",
				"  }",
				"}",
			].join("\n"),
			["buf"],
		);
		expect(writes.has("buf")).toBe(false);
	});

	it("a shadowed tick local of the same name does not count", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  let w = 0",
				"  return ({ in: x = 0 }) => {",
				"    let w = x",
				"    w = w + 1",
				"    return w",
				"  }",
				"}",
			].join("\n"),
			["w"],
		);
		expect(writes.has("w")).toBe(false);
	});
});
