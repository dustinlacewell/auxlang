/**
 * `tickWrites` finds the setup locals a tick writes: assigned, updated, the
 * root of an assigned member target, passed as a call argument, or
 * aliased by a declaration that can read a reference (alias-shape.ts, given
 * `shapes`). A read-only reference, a declaration reading a plain number or
 * boolean (never an alias), or a shadowed tick local of the same name, does
 * not count.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/dsp/lower/file-program";
import { findSetup } from "@/dsp/lower/find-setup";
import { setupParts } from "@/dsp/lower/setup-parts";
import { tickWrites } from "@/dsp/lower/tick-writes";
import type { SourceText } from "@/dsp/source-text";
import type { StateShape } from "@/dsp/front/state/state-shape";

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

	it("a destructured alias `const { env } = voice; env.t += 1` counts the root `voice` (the shape-gated alias rule reached through a pattern, lift-destructuring's own kind of declaration)", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voice = { env: { t: 0 }, gain: 1 }",
				"  return ({ in: i = 0 }) => {",
				"    const { env } = voice",
				"    env.t += 1",
				"    return voice.env.t",
				"  }",
				"}",
			].join("\n"),
			["voice"],
			new Map<string, StateShape>([
				[
					"voice",
					{
						k: "record",
						fields: { env: { k: "record", fields: { t: { k: "number" } } }, gain: { k: "number" } },
					},
				],
			]),
		);
		expect(writes.has("voice")).toBe(true);
	});

	it("a destructured number field `const { gain } = voice` does not count: a plain number is never an alias", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voice = { env: { t: 0 }, gain: 1 }",
				"  return ({ in: i = 0 }) => {",
				"    const { gain } = voice",
				"    return gain",
				"  }",
				"}",
			].join("\n"),
			["voice"],
			new Map<string, StateShape>([
				[
					"voice",
					{
						k: "record",
						fields: { env: { k: "record", fields: { t: { k: "number" } } }, gain: { k: "number" } },
					},
				],
			]),
		);
		expect(writes.has("voice")).toBe(false);
	});

	it("buf.fill(0) counts the receiver buf, same as an element write", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  return ({ in: x = 0 }) => {",
				"    buf.fill(0)",
				"    return buf[0]",
				"  }",
				"}",
			].join("\n"),
			["buf"],
		);
		expect(writes.has("buf")).toBe(true);
	});

	it("a setup local passed as a call argument counts even when the callee is a nested arrow, read on the original (pre-lift) AST: lift-nested-arrows.ts hoists the arrow later, but the argument site is already a write by the plain call-argument rule", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  return ({ in: x = 0 }) => {",
				"    const fill = (b) => b",
				"    fill(buf)",
				"    return buf[0]",
				"  }",
				"}",
			].join("\n"),
			["buf"],
		);
		expect(writes.has("buf")).toBe(true);
	});

	it("a setup local reached through an arrow's own param counts: const bump = (v) => { v.x += 1 }; bump(voices[0]) writes through the element back into voices", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voices = [{ x: 0 }, { x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    const bump = (v) => { v.x += 1 }",
				"    bump(voices[0])",
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

	it("buf.set(src) counts the receiver buf (the existing call-argument rule also counts src, conservatively, the same as any call passing a local)", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  const src = new Float64Array(sr)",
				"  return ({ in: x = 0 }) => {",
				"    buf.set(src)",
				"    return buf[0]",
				"  }",
				"}",
			].join("\n"),
			["buf", "src"],
		);
		expect(writes.has("buf")).toBe(true);
	});

	it("buf.copyWithin(...) counts the receiver buf", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  return ({ in: x = 0 }) => {",
				"    buf.copyWithin(0, 1)",
				"    return buf[0]",
				"  }",
				"}",
			].join("\n"),
			["buf"],
		);
		expect(writes.has("buf")).toBe(true);
	});

	it("buf.forEach((v) => { acc += v }) counts acc, a setup local the callback writes directly", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(sr)",
				"  let acc = 0",
				"  return ({ in: x = 0 }) => {",
				"    buf.forEach((v) => { acc += v })",
				"    return acc",
				"  }",
				"}",
			].join("\n"),
			["buf", "acc"],
		);
		expect(writes.has("acc")).toBe(true);
	});

	it("voices.forEach((v) => { v.x += 1 }) counts voices, the array the callback's element parameter aliases", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voices = [{ x: 0 }, { x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    voices.forEach((v) => { v.x += 1 })",
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

	it("an address select `const v = cond ? voices[0] : voices[1]; v.x += 1` counts the root `voices` (both elements share one field, read on the ORIGINAL ConditionalExpression)", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voices = [{ x: 0 }, { x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    const v = i > 50 ? voices[0] : voices[1]",
				"    v.x += 1",
				"    return voices[0].x + voices[1].x",
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

	it("buf.forEach((v) => { acc += v }) over a typed array does not count buf: a number element is never an alias", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const buf = new Float64Array(4)",
				"  let acc = 0",
				"  return ({ in: i = 0 }) => {",
				"    buf.forEach((v) => { acc += v })",
				"    return acc",
				"  }",
				"}",
			].join("\n"),
			["buf", "acc"],
			new Map<string, StateShape>([["buf", { k: "array", type: "f64", length: 4 }]]),
		);
		expect(writes.has("buf")).toBe(false);
	});

	it("an address select between two DIFFERENT fields `const v = cond ? bufA : bufB; v[0] += 1` counts BOTH roots: the static analysis cannot know which one `cond` picked", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const bufA = new Float64Array(4)",
				"  const bufB = new Float64Array(4)",
				"  return ({ in: i = 0 }) => {",
				"    const v = i > 50 ? bufA : bufB",
				"    v[0] += 1",
				"    return bufA[0] + bufB[0]",
				"  }",
				"}",
			].join("\n"),
			["bufA", "bufB"],
			new Map<string, StateShape>([
				["bufA", { k: "array", type: "f64", length: 4 }],
				["bufB", { k: "array", type: "f64", length: 4 }],
			]),
		);
		expect(writes.has("bufA")).toBe(true);
		expect(writes.has("bufB")).toBe(true);
	});

	it("an address select read on through a further alias and a nested select counts every root", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const va = [{ env: { x: 0 } }]",
				"  const vb = [{ env: { x: 0 } }]",
				"  const vc = [{ env: { x: 0 } }]",
				"  return ({ in: i = 0 }) => {",
				"    const v = i > 50 ? va[0] : i > 10 ? vb[0] : vc[0]",
				"    const e = v.env",
				"    e.x += 1",
				"    return 0",
				"  }",
				"}",
			].join("\n"),
			["va", "vb", "vc"],
		);
		expect([...writes].sort()).toEqual(["va", "vb", "vc"]);
	});

	it("an address select passed on through an element read to a writing arrow counts both roots", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const va = [{ x: 0 }]",
				"  const vb = [{ x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    const bump = (r) => { r.x += 1 }",
				"    const arr = i > 50 ? va : vb",
				"    bump(arr[0])",
				"    return 0",
				"  }",
				"}",
			].join("\n"),
			["va", "vb"],
		);
		expect([...writes].sort()).toEqual(["va", "vb"]);
	});

	it("an address select written through `.fill` (`v.fill(0)`) counts BOTH roots, same as a plain element write", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const bufA = new Float64Array(4)",
				"  const bufB = new Float64Array(4)",
				"  return ({ in: i = 0 }) => {",
				"    const v = i > 50 ? bufA : bufB",
				"    v.fill(0)",
				"    return bufA[0] + bufB[0]",
				"  }",
				"}",
			].join("\n"),
			["bufA", "bufB"],
			new Map<string, StateShape>([
				["bufA", { k: "array", type: "f64", length: 4 }],
				["bufB", { k: "array", type: "f64", length: 4 }],
			]),
		);
		expect(writes.has("bufA")).toBe(true);
		expect(writes.has("bufB")).toBe(true);
	});

	it("an address select that is only read does not count: reading through either candidate is not a write", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voices = [{ x: 0 }, { x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    const v = i > 50 ? voices[0] : voices[1]",
				"    return v.x",
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

	it("a nested address select `cond1 ? (cond2 ? voices[0] : voices[1]) : voices[0]` counts the root `voices`", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voices = [{ x: 0 }, { x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    const v = i > 50 ? (i > 25 ? voices[0] : voices[1]) : voices[0]",
				"    v.x += 1",
				"    return voices[0].x + voices[1].x",
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

	it("an address select re-aliased through a second local (`const w = v`, `w.x += 1`) still counts the root", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voices = [{ x: 0 }, { x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    const v = i > 50 ? voices[0] : voices[1]",
				"    const w = v",
				"    w.x += 1",
				"    return voices[0].x + voices[1].x",
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

	it("an address select written through a call argument (`fill(v)`) counts the root, same as any alias", () => {
		const writes = lowerTick(
			[
				"({ sr }) => {",
				"  const voices = [{ x: 0 }, { x: 0 }]",
				"  return ({ in: i = 0 }) => {",
				"    const v = i > 50 ? voices[0] : voices[1]",
				"    bump(v)",
				"    return voices[0].x + voices[1].x",
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
