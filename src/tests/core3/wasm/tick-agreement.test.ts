/**
 * The agreement table: each tick snippet either passes the shared checker and
 * renders on WASM bit-identical to the interpreter (accept), or the checker
 * refuses it, at eval or at build on both engines (reject).
 */

import "@/core3/modules/all";

import type { Program } from "@/core3/types";
import { evalPatch } from "@/core3/eval-patch";
import { describe, expect, it } from "vitest";
import { evalInternal } from "../fixtures/internal-module";
import { expectIdentical, interpreterRun, wasmRun } from "./differential-harness";

const SAMPLES = 1024;

/** A patch whose module `ag` has `body` as its tick and `helpers` as its helpers. */
function patch(body: string, helpers = ""): string {
	return `tempo(120)
const ag = defineInternalModule({
  name: "ag",
  category: "utils",
  ins: { in: sig(0) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  config: { mode: "a" },
  state: () => ({ n: 0, acc: 0, buf: new Float64Array(4), a: new Float32Array(2), b: new Float32Array(2), voices: [{ x: 0 }, { x: 0 }], v: { x: 0 } }),
  helpers: { ${helpers} },
  tick: (s, i, o, cfg, sr, width) => {
    ${body}
  },
})
seq("[c3,e3] <g3 a3>").ag().mul(0.1).out()`;
}

interface Row {
	readonly what: string;
	readonly body: string;
	readonly helpers?: string | undefined;
	/** Reject rows: the checker's message, when it already has one. */
	readonly message?: RegExp | undefined;
}

const accept = (what: string, body: string, helpers?: string): Row => ({ what, body, helpers });
const reject = (what: string, body: string, message?: RegExp, helpers?: string): Row => ({
	what,
	body,
	helpers,
	message,
});

/** Forms both backends accept and render alike today. */
const AGREED_ACCEPT: readonly Row[] = [
	accept("arithmetic and comparisons", "o.out = (i.in * 0.5 + 1) / 3 - (i.in > 50 ? 1 : 0)"),
	accept("exponent", "o.out = 2 ** (i.in * 0.01)"),
	accept("bitwise operators", "o.out = ((s.n | 0) & 3) + (s.n >>> 1) + ~s.n; s.n++"),
	accept("Math functions and constants", "o.out = Math.sin(s.n * Math.PI * 0.01) + Math.max(1, i.in) * 0; s.n++"),
	accept("Math.random and hashRandom", "o.out = Math.random() + hashRandom(s.n % 5); s.n++"),
	accept("a nested ternary", "o.out = i.in > 50 ? 1 : i.in > 40 ? 2 : 3"),
	accept("a comma expression", "let a = 0; a = (s.n++, s.n); o.out = a % 5"),
	accept(
		"labelled loops with continue",
		"s.acc = 0; outer: for (let a = 0; a < 3; a++) { for (let b = 0; b < 3; b++) { if (b === a) continue outer; s.acc += b } } o.out = s.acc",
	),
	accept("do-while", "let j = 0; do { j++ } while (j < 3); o.out = j"),
	accept("switch with fall-through", "switch (s.n % 3) { case 0: o.out = 1; case 1: o.out = 2; break; default: o.out = 3 } s.n++"),
	accept("a shadowing block const", "let n = 1; { const n = 2; o.out = n } o.out += n"),
	accept("a block const shadowing the state parameter", "{ const s = 3; o.out = s }"),
	accept("a block const shadowing a helper", "{ const f = 2; o.out = f }", "f: (x) => x"),
	accept("a helper calling a helper", "o.out = g(i.in)", "f: (x) => x * 2, g: (x) => f(x) + 1"),
	accept("writing the sample rate", "sr = sr * 2; o.out = sr * 0.0001"),
	accept("writing the width", "width = 2; o.out = width"),
	accept("an element of an array of records", "s.voices[s.n % 2].x += i.in; s.n++; o.out = s.voices[1].x"),
	accept("reading a nested record through a const", "const v = s.v; o.out = v.x"),
	accept("typeof of an input", 'o.out = typeof i.in === "number" ? 1 : 0'),
	accept("typeof of a local", 'let x = i.in; o.out = typeof x === "number" ? 1 : 0'),
	accept("typeof of an out-of-range element", 'o.out = typeof s.buf[9] === "undefined" ? 1 : 0'),
	accept("typeof of an in-range element", 'o.out = typeof s.buf[0] === "number" ? 1 : 0'),
	accept("?? after an out-of-range read", "o.out = s.buf[s.n + 7] ?? 0.5; s.n = (s.n + 1) % 3"),
	accept("?? after a negative index", "o.out = s.buf[-1] ?? 2"),
	accept(
		"?? after a local fed from an in-range element, lifted to a validity flag",
		"const v = s.buf[s.n % 4]; o.out = v ?? 5; s.n++",
	),
	accept(
		"?? after a local fed from a past-end element, lifted to a validity flag",
		"const v = s.buf[s.n + 7]; o.out = v ?? 0.5; s.n = (s.n + 1) % 3",
	),
	accept(
		"?? after a local fed from a negative-index element, lifted to a validity flag",
		"const v = s.buf[-1]; o.out = v ?? 2",
	),
	accept(
		"?? after a local fed from a fractional-index element, lifted to a validity flag",
		"const v = s.buf[s.n + 0.5]; o.out = v ?? 3; s.n++",
	),
	accept("an out-of-range read without ??", "o.out = s.buf[9]; s.n++"),
	accept("an out-of-range write", "s.buf[9] = 1; o.out = s.buf[0]"),
	// Found by generated-ticks: an out-of-range read is undefined in JS and NaN on WASM.
	accept("an out-of-range read used as an index", "o.out = s.buf[s.buf[9]] ?? 1"),
	accept("an out-of-range read as an exponent", "o.out = 1 ** s.buf[5]"),
	accept("a boolean index", "o.out = s.buf[i.in > 50] ?? 2"),
	accept("an out-of-range read into Math", "o.out = Math.sin(s.buf[7]) + Math.max(s.buf[s.n + 3], 1); s.n++"),
	accept("a typed array in a let, let a = s.buf", "let a = s.buf; a[0] = i.in; o.out = a[0]"),
	accept("a let rebound to another typed array", "let a = s.a; a = s.b; o.out = a[0]"),
	accept(
		"a let rebound on one branch, then written",
		"let a = s.a; if (i.in > 50) a = s.b; a[s.n % 2] += 1; s.n++; o.out = s.a[0] - s.b[1]",
	),
	accept("a rebind read as an array, (a = s.b)[k]", "s.b[1] = i.in; let a = s.a; o.out = (a = s.b)[s.n % 2] - a[1]; s.n++"),
	accept("a rebind inside an index reads the old array", "s.b[0] = 5; let a = s.a; o.out = a[(a = s.b, 0)] + a[0] * 2"),
	accept("a rebind inside a written value", "let a = s.a; a[0] = (a = s.b, i.in); o.out = s.a[0] * 10 + s.b[0]"),
	accept("&&= on an element", "s.buf[0] = 1; s.buf[0] &&= i.in; o.out = s.buf[0]"),
	accept("||= on an element", "s.buf[1] ||= i.in; o.out = s.buf[1]"),
	accept("??= on an element", "s.buf[2] ??= i.in; o.out = s.buf[2]"),
	accept("&&= on a local", "let a = 1; a &&= i.in; o.out = a"),
	accept("||= on a state field, kept", "s.acc = s.acc > 3 ? 0 : s.acc; o.out = (s.acc ||= i.in) + s.acc; s.acc += 1"),
	accept("&&= on a boolean local", "let b = i.in > 40; b &&= i.in < 60; o.out = b ? 1 : 0"),
	accept("??= at a run-time index runs its right side out of range", "s.buf[s.n % 6] ??= s.acc++; s.n++; o.out = s.acc"),
	accept("??= at a known invalid index, kept", "o.out = (s.buf[9] ??= i.in) + s.buf[0]"),
	accept("&&= at a known invalid index skips its right side", "s.buf[9] &&= s.acc++; o.out = s.acc"),
	accept("a boolean stored in an element, kept", "o.out = (s.buf[0] = i.in > 3) ? 1 : 0"),
	accept("||= of a boolean at a known invalid index, kept", "o.out = (s.buf[9] ||= i.in > 3) ? 1 : 0"),
	accept("||= of a boolean in an element, kept", "o.out = (s.buf[s.n % 6] ||= i.in > 3) ? 1 : 0; s.n++"),
	accept("||= on an element, kept","o.out = (s.buf[s.n % 6] ||= i.in * 2); s.n++"),
	accept("a config string in a let, let m = cfg.mode", 'let m = cfg.mode; o.out = m === "a" ? 1 : 0'),
	accept("the state record in a const, const t = s", "const t = s; t.n++; o.out = t.n % 3"),
	accept(
		"writes through const v = s.voices[k]",
		"const v = s.voices[s.n % 2]; s.n++; v.x += 1; o.out = s.voices[0].x",
	),
	accept("a record parameter written in a helper", "o.out = bump(s.v)", "bump: (r) => { r.x += 1; return r.x }"),
	accept(
		"a typed-array parameter reassigned in a helper",
		"o.out = pick(s.a, s.b)",
		"pick: (p, q) => { p = q; return p[0] }",
	),
	accept("an alias of a state alias", "const t = s; const u = t; u.n++; o.out = u.n % 3"),
	accept("a state alias passed to a helper", "const t = s; o.out = bump(t)", "bump: (r) => { r.n += 1; return r.n % 3 }"),
	accept("an outputs alias", "const q = o; q.out = i.in"),
	accept("an inputs alias", "const x = i; o.out = x.in"),
	accept("a config alias", 'const c = cfg; o.out = c.mode === "a" ? 1 : 0'),
	accept(
		"a helper taking the state record and one of its records",
		"o.out = add(s, s.voices[s.n % 2]); s.n++",
		"add: (r, v) => { v.x += 1; r.acc += v.x; return r.acc }",
	),
	accept(
		"the state record at two arguments of one helper",
		"o.out = f(s, s); s.acc++",
		"f: (a, b) => { a.acc += 1; return b.acc }",
	),
	accept(
		"one helper taking a record at a fixed and at a run-time address",
		"o.out = f(s.v) + f(s.voices[s.n % 2]); s.n++",
		"f: (r) => { r.x += 0.5; return r.x }",
	),
	accept(
		"a record parameter reassigned in a helper",
		"o.out = pick(s.voices[0], s.voices[1])",
		"pick: (p, q) => { p = q; p.x += 1; return p.x }",
	),
	accept("a nested record written through a const", "const v = s.v; v.x += i.in; o.out = s.v.x"),
	accept("swapping typed-array state, s.a = s.b", "s.a = s.b; o.out = s.a[0]"),
	accept("a write through one name of a swapped pair", "s.a = s.b; s.b[0] = i.in; o.out = s.a[0]"),
	accept(
		"a three-way swap through a const",
		"s.a[0] = s.n; s.b[0] = -s.n; s.n++; const t = s.a; s.a = s.b; s.b = t; s.a[1] += 1; o.out = s.a[0] * 10 + s.b[1]",
	),
	accept("a field rebind read as an array", "o.out = (s.a = s.b)[0] + s.a.length"),
	accept("a field rebind inside an index reads the old array", "s.b[0] = 5; o.out = s.a[(s.a = s.b, 0)] + s.a[0] * 2"),
	accept(
		"a record field rebound to a record at a run-time index",
		"s.v = s.voices[s.n % 2]; s.n++; s.v.x += 1; o.out = s.voices[0].x - s.voices[1].x",
	),
	accept("&&= on an array field always rebinds it", "s.a &&= s.b; s.b[0] = i.in; o.out = s.a[0]"),
	accept("||= on an array field keeps it", "s.a ||= s.b; s.b[0] = i.in; o.out = s.a[0]"),
	accept("&&= on an array variable rebinds it", "let a = s.a; a &&= s.b; s.b[0] = i.in; o.out = a[0]"),
	accept(
		"a swap in a helper given the state record",
		"o.out = sw(s)",
		"sw: (r) => { const t = r.a; r.a = r.b; r.b = t; r.a[0] += 1; return r.a[0] - r.b[0] }",
	),
	accept("a record stored into an array of records", "s.voices[0] = s.voices[1]; s.voices[0].x += 1; o.out = s.voices[1].x"),
	accept("=== undefined of an out-of-range element", "o.out = s.buf[10] === undefined ? 1 : 0"),
	accept("=== undefined of a negative-index element", "o.out = s.buf[-1] === undefined ? 1 : 0"),
	accept("=== undefined of an in-range element", "o.out = s.buf[0] === undefined ? 1 : 0"),
	accept(
		"a helper comparing its parameter to undefined, out of range",
		"o.out = isMissing(s.buf[10])",
		"isMissing: (p) => p === undefined ? 1 : 0",
	),
	accept(
		"a helper comparing its parameter to undefined, in range",
		"o.out = isMissing(s.buf[0])",
		"isMissing: (p) => p === undefined ? 1 : 0",
	),
	accept("== null of an out-of-range element", "o.out = s.buf[10] == null ? 1 : 0"),
	accept(
		"an element swap through a const",
		"s.voices[0].x = s.n; s.voices[1].x = -s.n; s.n++; const t = s.voices[0]; s.voices[0] = s.voices[1]; s.voices[1] = t; s.voices[0].x += 0.5; o.out = s.voices[0].x * 10 + s.voices[1].x",
	),
	accept("a write through one alias of an element", "s.voices[1] = s.voices[0]; s.voices[1].x += i.in; o.out = s.voices[0].x"),
	accept(
		"an element swap in a helper",
		"o.out = sw(s.voices)",
		"sw: (l) => { const t = l[0]; l[0] = l[1]; l[1] = t; l[0].x += 1; return l[0].x - l[1].x }",
	),
	accept(
		"an element rebound at a proven run-time index",
		"const k = (s.n | 0) & 1; s.voices[k] = s.voices[1 - k]; s.n++; s.voices[k].x += 1; o.out = s.voices[0].x - s.voices[1].x",
	),
	accept("a record field stored into an array of records", "s.voices[0] = s.v; s.v.x += 1; o.out = s.voices[0].x"),
	accept("&&= on an element of an array of records", "s.voices[0] &&= s.voices[1]; s.voices[1].x += 1; o.out = s.voices[0].x"),
	accept("**= on a local, lifted to x = x ** y", "let x = 2; x **= 1 + (i.in > 50 ? 1 : 0); o.out = x"),
	accept("**= on a state field, lifted", "s.acc = 2; s.acc **= 2; o.out = s.acc"),
	accept(
		"**= on an element at a side-effecting index, lifted with the index hoisted",
		"s.buf[0] = 2; o.out = (s.buf[s.n++ % 4] **= 2) + s.n; s.n = s.n % 4",
	),
	accept("a computed state field with a string-literal key, lifted to the dot form", 'o.out = s["n"]; s.n++'),
	accept("a computed record field with a string-literal key, lifted to the dot form", 'const v = s.v; o.out = v["x"]'),
	accept("optional chaining on a named member, stripped", "o.out = s?.n; s.n++"),
	accept("optional chaining on a computed member, stripped", "o.out = s.buf?.[s.n]; s.n++"),
	accept(
		"optional chaining on a helper call, stripped",
		"o.out = f?.(i.in)",
		"f: (x) => x * 2",
	),
	accept(
		"for...of summing a typed array, lifted to an index loop",
		"let acc = 0; for (const x of s.buf) acc += x; o.out = acc; s.buf[s.n % 4] = i.in; s.n++",
	),
	accept(
		"for...of mutating an array of records, lifted to an index loop",
		"for (const v of s.voices) v.x += 1; o.out = s.voices[0].x + s.voices[1].x",
	),
	accept(
		"for...of with continue and break, lifted to an index loop",
		"let acc = 0; for (const v of s.voices) { if (v.x > 100) continue; if (v.x > 1000) break; acc += v.x; v.x += 1 } o.out = acc",
	),
	accept(
		"nested for...of, both loops lifted",
		"let acc = 0; for (const v of s.voices) { for (const w of s.voices) acc += w.x } o.out = acc",
	),
	accept(
		"a string literal initialising a never-reassigned const, read later in a comparison",
		'const target = "a"; o.out = cfg.mode === target ? 1 : 0',
	),
	accept(
		"an object declaration destructures, a renamed field keeps its own name",
		"const { x: vx } = s.v; o.out = vx; s.v.x += 1",
	),
	accept("an array declaration destructures by index", "const [first, second] = s.buf; o.out = first + second; s.buf[0] += 1"),
	accept(
		"a destructuring default fires only when the read is undefined",
		"const { x = 7 } = s.v; o.out = x",
	),
	accept(
		"an array-destructure default at an out-of-range index agrees with an element read's own ?? default",
		"const [a, b, c, d, outOfRange = 9] = s.buf; o.out = a + b + c + d + outOfRange; s.buf[0] += 1",
	),
	accept(
		"a nested object pattern reads through the outer field",
		"const { v: { x } } = s; o.out = x; s.v.x += 1",
	),
	accept(
		"a helper's destructured params become plain names with declarations at the top",
		"o.out = f(s.v, s.buf)",
		"f: ({ x }, [p, q]) => x + p + q",
	),
	accept(
		"a for...of destructuring head lifts to a plain local, then an index loop",
		"let acc = 0; for (const { x } of s.voices) acc += x; o.out = acc",
	),
	accept(
		"the two-element swap idiom lifts to a temp exchange, no array literal",
		"let a = s.n, b = s.acc; [a, b] = [b, a]; o.out = a - b; s.n++",
	),
	accept(
		"an uninitialised let assigned before its only read lifts to = 0",
		"let x; x = i.in; o.out = x",
	),
	accept(
		"an uninitialised let assigned on every branch of an if lifts",
		"let x; if (i.in > 0) { x = 1 } else { x = 2 } o.out = x",
	),
	accept(
		"a typed-array fill lifts to an index loop over the whole length",
		"s.buf.fill(2); o.out = s.buf[0] + s.buf[3]",
	),
	accept(
		"a typed-array fill with start and end lifts to an index loop between them",
		"s.buf.fill(5, 1, 3); o.out = s.buf[0] + s.buf[1] + s.buf[3]",
	),
	accept(
		"a typed-array set copies another array in, lifts to an index loop",
		"s.a[0] = 1; s.a[1] = 2; s.b.set(s.a); o.out = s.b[0] + s.b[1]",
	),
	accept(
		"a typed-array set with an offset shifts the write index",
		"s.a[0] = 1; s.buf.set(s.a, 1); o.out = s.buf[1]",
	),
	accept(
		"a typed-array copyWithin shifts a range forward, lifts to a direction-aware loop",
		"s.buf[0] = 1; s.buf[1] = 2; s.buf[2] = 3; s.buf.copyWithin(1, 0, 2); o.out = s.buf[1] + s.buf[2]",
	),
	accept(
		"a typed-array copyWithin shifts a range backward, overlapping",
		"s.buf[0] = 1; s.buf[1] = 2; s.buf[2] = 3; s.buf.copyWithin(0, 1); o.out = s.buf[0] + s.buf[1] + s.buf[2]",
	),
	accept(
		"a typed-array forEach with one parameter sums into a state field",
		"s.acc = 0; s.buf.forEach((v) => { s.acc += v }); o.out = s.acc; s.buf[s.n % 4] = i.in; s.n++",
	),
	accept(
		"a typed-array forEach with two parameters doubles each element in place",
		"s.buf.forEach((v, k) => { s.buf[k] = v * 2 }); o.out = s.buf[0] + s.buf[1]",
	),
	accept(
		"an array-of-records forEach writes through the element parameter",
		"s.voices.forEach((v) => { v.x += 1 }); o.out = s.voices[0].x + s.voices[1].x",
	),
	accept(
		"a nested arrow with no captured writes lifts to a helper",
		"const lerp = (a, b, t) => a + (b - a) * t; o.out = lerp(1, 2, 0.5)",
	),
	accept(
		"a nested arrow's captured read becomes a trailing param, filled in at the call",
		"const addN = (a) => a + s.n; o.out = addN(1); s.n++",
	),
	accept(
		"a nested arrow inside another nested arrow lifts first, its own call already widened",
		"const outer = (a) => { const inner = (b) => b + s.n; return inner(a) }; o.out = outer(1); s.n++",
	),
	accept(
		"a record chosen through a ternary (address select) lifts to a let rebound on the test",
		"const v = s.n % 2 === 0 ? s.voices[0] : s.voices[1]; v.x += i.in; s.n++; o.out = v.x",
	),
];

/** Forms the checker refuses, so neither backend runs them. */
const AGREED_REJECT: readonly Row[] = [
	reject(
		"an uninitialised let that may be read before assignment",
		"let x; if (i.in > 0) { x = 1 } o.out = x",
		/'x' may be read before it has a value/,
	),
	reject("a recursive helper", "o.out = f(i.in)", /helpers may not recurse \(f → f\)/, "f: (x) => x > 0 ? f(x - 1) : 0"),
	reject("Math.random in a helper", "o.out = f(1)", /Math\.random\(\) is available only in tick/, "f: (x) => Math.random() * x"),
	reject(
		"a nested arrow writing a captured local",
		"const bad = (a) => { s.n = a; return a }; o.out = bad(1)",
		/a lifted helper has no closure, so it cannot write through a captured name/,
	),
	reject("a closure bound by let, not const, is not lifted", "let f = (x) => x; o.out = f(1)", /nested functions are closures/),
	reject("an array literal", "const v = [1, 2]; o.out = v[0]", /array literals allocate/),
	reject("new", "const v = new Float32Array(2); o.out = v[0]", /`new` allocates/),
	reject("delete", "delete s.n; o.out = 1", /`delete` removes fields/),
	reject("the in operator", 'o.out = "n" in s ? 1 : 0', /`in` is not allowed/),
	reject("this", "o.out = this.x", /`this` is not available/),
	reject("a computed string key not an identifier", 'o.out = s["1a"]', /computed property names with non-numeric keys/),
	reject("a runtime string", 'const v = "a" + i.in; o.out = 1', /string values may appear only in comparisons/),
	reject(
		"a rest element in a destructuring declaration",
		"const { x, ...r } = s.v; o.out = x",
		/rest element in destructuring allocates/,
	),
	reject(
		"a non-swap destructuring assignment",
		"let a = 0, b = 0, c = 0; [a, b] = [b, c]; o.out = a",
		/only the two-element swap/,
	),
	reject("writing the state parameter, s = 0", "s = 0; o.out = 1", /assigns to 's', the tick's state record/),
	reject("writing the inputs parameter, i = 0", "i = 0; o.out = 1", /assigns to 'i', the tick's inputs record/),
	reject("writing the outputs parameter, o = 0", "o = 0", /assigns to 'o', the tick's outputs record/),
	reject("updating the config parameter, cfg++", "cfg++; o.out = 1", /assigns to 'cfg', the tick's config record/),
	reject("a let rebound to a typed array of another type", "let a = s.a; a = s.buf; o.out = a[0]", /takes only an array or record of the same type and length/),
	reject("arithmetic on a typed-array let", "let a = s.a; a = s.b; a += 1; o.out = 1", /takes only an array or record of the same type/),
	reject("??= on a local", "let x = 0; x ??= i.in; o.out = x", /`\?\?` is allowed only on a direct array element/),
	reject(
		"?? on a local fed from a direct element, reassigned before the ??",
		"let x = s.buf[s.n]; x = 0; o.out = x ?? 0",
		/`\?\?` is allowed only on a direct array element/,
	),
	reject("a typed array stored in a number let", "let x = 0; x = s.buf; o.out = 1", /an array or record stored where a number is kept/),
	reject("a written let holding a string", 'let m = cfg.mode; if (i.in > 50) m = cfg.mode; o.out = 1', /strings exist only while compiling/),
	reject("a state alias adding a field", "const t = s; t.zz = 1; o.out = 1", /adds field 't\.zz'/),
	reject("a state alias reading a missing field", "const t = s; o.out = t.zz", /unknown state field 'zz'/),
	reject("writing through an inputs alias", "const x = i; x.in = 1; o.out = 1", /inputs and config are read-only/),
	reject("an unknown output through an alias", "const q = o; q.zz = 1", /unknown output 'zz'/),
	reject("reassigning a state alias", "let t = s; t = s; o.out = 1", /assigns to 't', the tick's state record/),
	reject("a state record stored as a number", "o.out = s", /a parameter record stored/),
	reject("a helper adding a field to a record", "o.out = f(s.v)", /adds field 'y'/, "f: (r) => { r.y = 1; return 0 }"),
	reject("a helper reading a missing field", "o.out = f(s)", /unknown field 'zz'/, "f: (r) => r.zz"),
	reject("a helper indexing the state record", "o.out = f(s)", /fields must be named, not computed/, "f: (r) => r[0]"),
	reject("a nested missing field", "o.out = s.v.y", /unknown field 'y'/),
	reject("a typed array in arithmetic", "o.out = s.buf + 1", /an array or record used as a number/),
	reject("the state record negated", "o.out = -s", /an array or record used as a number/),
	reject("a logical assignment of an array used as a number", "o.out = (s.a ||= s.b)", /an array or record used as a number/),
	reject("a known pick of an array", "o.out = (1 && s.a)[0]", /an array or record used as a number/),
	reject("an array tested", "if (s.a) o.out = 1", /an array or record used as a number/),
	reject("an array as an index", "o.out = s.buf[s.a]", /an array or record used as a number/),
	reject("the last of a comma expression, an array", "o.out = (0, s.a)", /an array or record used as a number/),
	reject("a helper returning an array", "o.out = f(s.a)[0]", /an array or record used as a number/, "f: (p) => p"),
	reject("an array stored into a typed array element", "s.buf[0] = s.a; o.out = 1", /an array or record used as a number/),
	reject("a number stored over a record of an array of records", "s.voices[0] = 1; o.out = 1", /takes only an array or record of the same type/),
	reject("a record stored at an index not proven in range", "s.voices[s.n % 2] = s.v; o.out = 1", /index not proven inside the array/),
	reject("a field of a number", "const k = i.in; o.out = k.n", /reads field 'n' of a value that is not a record/),
	reject(
		"a field of a number, in a helper also given the state record",
		"o.out = f(s, 1) + f(2, s)",
		/reads field 'n' of a value that is not a record/,
		"f: (a, b) => a.n + b",
	),
	reject("a field rebound to a typed array of another type", "s.a = s.buf; o.out = 1", /takes only an array or record of the same type and length/),
	reject("a record field rebound to a typed array", "s.v = s.a; o.out = 1", /takes only an array or record of the same type and length/),
	reject(
		"a helper array parameter rebound to another type",
		"o.out = f(s.a, s.buf)",
		/takes only an array or record of the same type and length/,
		"f: (p, q) => { p = q; return p[0] }",
	),
	reject(
		"a fill used as a value, not its own statement",
		"let x = s.buf.fill(0); o.out = x",
		/is lifted only as its own statement, not as a value/,
	),
	reject(
		"a forEach callback that is not an inline arrow",
		"s.buf.forEach(double); o.out = s.buf[0]",
		/callback must be an inline arrow/,
		"double: (v) => v",
	),
];

function expectAccepted(row: Row): void {
	expectIdentical(evalInternal(patch(row.body, row.helpers)), SAMPLES);
}

/** Refused at eval (the rules), or at build on both engines (the kind check). */
function expectRejected(row: Row): void {
	const message = row.message ?? /./;
	let program: Program;
	try {
		program = evalInternal(patch(row.body, row.helpers));
	} catch (error) {
		expect(String(error)).toMatch(message);
		return;
	}
	expect(() => interpreterRun(program, 1)).toThrow(message);
	expect(() => wasmRun(program, 1)).toThrow(message);
}

describe("tick forms: both backends agree", () => {
	for (const row of AGREED_ACCEPT) it(`accept: ${row.what}`, () => expectAccepted(row));
	for (const row of AGREED_REJECT) it(`reject: ${row.what}`, () => expectRejected(row));
});

/**
 * Helper param defaults (card step 11, lowered in `lower-module.ts`'s
 * `helper-param-defaults.ts`, not bind-sugar): a default is inserted at an
 * omitted call-site argument, never applied to an explicit argument that
 * happens to read `undefined` at run time. The known trap: `s.buf[99]` is
 * `undefined` in JS and NaN on WASM — an EXPLICIT argument reading past the
 * end must stay that way on both engines, never silently become the
 * default.
 */
const SHAPE_C_PARAM_DEFAULTS = `function env(x, k = 0.5) { return x * k }

const m = defmod("m", { cat: "utils" }, ({ sr }) => {
  return ({ in: x = 0 }) => env(x) + env(x, 2) + env(x, x)
})

tempo(110)
const s = seq("c4 e4 <g4 a4> ~")
m(s.tri().mul(s.gate.ad(0.005, 0.2))).gain(0.3).out()`;

const SHAPE_C_PARAM_DEFAULT_PAST_END = `function pick(x, k = 0) { return x === undefined ? k : x }

const m = defmod("m", { cat: "utils" }, ({ sr }) => {
  const buf = new Float64Array(4)
  return ({ in: x = 0 }) => {
    buf[0] = x
    return pick(buf[99]) + pick(buf[0], 7)
  }
})

tempo(110)
const s = seq("c4 e4 <g4 a4> ~")
m(s.tri().mul(s.gate.ad(0.005, 0.2))).gain(0.3).out()`;

describe("shape C: helper param defaults, both backends agree", () => {
	it("a call omitting a defaulted trailing arg agrees with an explicit one", () => {
		expectIdentical(evalPatch(SHAPE_C_PARAM_DEFAULTS), SAMPLES);
	});

	it("an explicit argument reading past an array's end stays undefined-on-JS/NaN-on-WASM, never the default", () => {
		expectIdentical(evalPatch(SHAPE_C_PARAM_DEFAULT_PAST_END), SAMPLES);
	});
});
