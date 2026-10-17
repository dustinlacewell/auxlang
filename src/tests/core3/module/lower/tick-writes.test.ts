/**
 * `tickWrites` finds the setup locals a tick writes: assigned, updated, the
 * root of an assigned member target, passed as a call argument, or
 * aliased by a declaration that can read a reference (alias-shape.ts, given
 * `shapes`). A read-only reference, a declaration reading a plain number or
 * boolean (never an alias), or a shadowed tick local of the same name, does
 * not count.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/core3/module/lower/file-program";
import { findSetup } from "@/core3/module/lower/find-setup";
import { setupParts } from "@/core3/module/lower/setup-parts";
import { tickWrites } from "@/core3/module/lower/tick-writes";
import type { SourceText } from "@/core3/module/source-text";
import type { StateShape } from "@/core3/module/front/state/state-shape";

function lowerTick(
	setupBody: string,
	setupLocals: readonly string[],
	shapes: ReadonlyMap<string, StateShape> = new Map(),
) {
	const fileText = `defmod("m", {}, ${setupBody})`;
	const source: SourceText = { file: "patch", text: fileText };
	const program = fileProgram(source);
	const found = findSetup(program, fileText, setupBody);
	if (found === null) throw new Error("test setup: findSetup found nothing");
	const parts = setupParts(found.setup, "module 'm'");
	return tickWrites(parts.tick, new Set(setupLocals), shapes);
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

	it("an alias `const b = buf` that is only read does not count: reading through an alias is not a write", () => {
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
		expect(writes.has("buf")).toBe(false);
	});

	it("an alias `const b = buf` that is written through counts: `b[0] = x` reaches back into `buf`", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  return ({ in: x = 0 }) => {",
				"    const b = buf",
				"    b[0] = x",
				"    return b[0]",
				"  }",
				"}",
			].join("\n"),
			["buf"],
		);
		expect(writes.has("buf")).toBe(true);
	});

	it("a typed-array element read `const y = buf[i]` does not mark `buf` written: the element is a number, never an alias", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  return ({ in: i = 0 }) => {",
				"    const y = buf[i]",
				"    return y",
				"  }",
				"}",
			].join("\n"),
			["buf"],
			new Map<string, StateShape>([["buf", { k: "array", type: "f64", length: 4 }]]),
		);
		expect(writes.has("buf")).toBe(false);
	});

	it("a record's numeric property read `const n = rec.x` does not mark `rec` written: the property is a number, never an alias", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const rec = { x: 0, inner: { y: 0 } }",
				"  return ({ in: i = 0 }) => {",
				"    const n = rec.x",
				"    return n",
				"  }",
				"}",
			].join("\n"),
			["rec"],
			new Map<string, StateShape>([
				[
					"rec",
					{
						k: "record",
						fields: { x: { k: "number" }, inner: { k: "record", fields: { y: { k: "number" } } } },
					},
				],
			]),
		);
		expect(writes.has("rec")).toBe(false);
	});

	it("a record's record-shaped property read `const e = rec.inner` is an alias: writing through `e` marks `rec` written", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const rec = { x: 0, inner: { y: 0 } }",
				"  return ({ in: i = 0 }) => {",
				"    const e = rec.inner",
				"    e.y += 1",
				"    return rec.inner.y",
				"  }",
				"}",
			].join("\n"),
			["rec"],
			new Map<string, StateShape>([
				[
					"rec",
					{
						k: "record",
						fields: { x: { k: "number" }, inner: { k: "record", fields: { y: { k: "number" } } } },
					},
				],
			]),
		);
		expect(writes.has("rec")).toBe(true);
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

	it("a for...of head `for (const v of voices) v.x += 1` counts the root `voices`", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voices = [{ x: 0 }, { x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    for (const v of voices) v.x += 1",
				"    return voices[0].x",
				"  }",
				"}",
			].join("\n"),
			["voices"],
			new Map<string, StateShape>([
				["voices", { k: "records", length: 2, element: { k: "record", fields: { x: { k: "number" } } } }],
			]),
		);
		expect(writes.has("voices")).toBe(true);
	});

	it("a for...of head that is only read does not count: reading through it is not a write", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voices = [{ x: 0 }, { x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    let acc = 0",
				"    for (const v of voices) acc += v.x",
				"    return acc",
				"  }",
				"}",
			].join("\n"),
			["voices"],
			new Map<string, StateShape>([
				["voices", { k: "records", length: 2, element: { k: "record", fields: { x: { k: "number" } } } }],
			]),
		);
		expect(writes.has("voices")).toBe(false);
	});

	it("a for...of head over a typed array does not count: a number element is never an alias", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(4)",
				"  return ({ in: i = 0 }) => {",
				"    let acc = 0",
				"    for (const x of buf) acc += x",
				"    return acc",
				"  }",
				"}",
			].join("\n"),
			["buf"],
			new Map<string, StateShape>([["buf", { k: "array", type: "f64", length: 4 }]]),
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
