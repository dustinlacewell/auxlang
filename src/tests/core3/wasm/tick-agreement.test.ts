/**
 * The agreement table: each tick snippet either passes the shared checker and
 * renders on WASM bit-identical to the interpreter (accept), or the checker
 * refuses it at eval, before either backend sees it (reject). Rows whose
 * backends disagree today are `it.fails`; each one flips when the tick front
 * end closes it (card tick-front-end-2026-10-15, step 5).
 */

import "@/core3/modules/all";

import { evalPatch } from "@/ui/core3-playground/eval-patch";
import { describe, expect, it } from "vitest";
import { expectIdentical } from "./differential-harness";

const SAMPLES = 1024;

/** A patch whose module `ag` has `body` as its tick and `helpers` as its helpers. */
function patch(body: string, helpers = ""): string {
	return `tempo(120)
const ag = defmod({
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
	accept("?? after an out-of-range read", "o.out = s.buf[s.n + 7] ?? 0.5; s.n = (s.n + 1) % 3"),
	accept("?? after a negative index", "o.out = s.buf[-1] ?? 2"),
	accept("an out-of-range read without ??", "o.out = s.buf[9]; s.n++"),
	accept("an out-of-range write", "s.buf[9] = 1; o.out = s.buf[0]"),
];

/** Forms the checker refuses today, so neither backend runs them. */
const AGREED_REJECT: readonly Row[] = [
	reject("an uninitialised let", "let x; x = 1; o.out = x", /every variable needs an initial value/),
	reject("**=", "let x = 2; x **= 2; o.out = x", /`\*\*=` is not allowed/),
	reject("a recursive helper", "o.out = f(i.in)", /helpers may not recurse \(f → f\)/, "f: (x) => x > 0 ? f(x - 1) : 0"),
	reject("Math.random in a helper", "o.out = f(1)", /Math\.random\(\) is available only in tick/, "f: (x) => Math.random() * x"),
	reject("a closure", "const f = (x) => x; o.out = f(1)", /nested functions are closures/),
	reject("an array literal", "const v = [1, 2]; o.out = v[0]", /array literals allocate/),
	reject("new", "const v = new Float32Array(2); o.out = v[0]", /`new` allocates/),
	reject("delete", "delete s.n; o.out = 1", /`delete` removes fields/),
	reject("the in operator", 'o.out = "n" in s ? 1 : 0', /`in` is not allowed/),
	reject("this", "o.out = this.x", /`this` is not available/),
	reject("a computed string key", 'o.out = s["n"]', /computed property names with non-numeric keys/),
	reject("a runtime string", 'const v = "a" + i.in; o.out = 1', /string values may appear only in comparisons/),
	reject("for...of", "for (const x of s.buf) o.out = x", /for\.\.\.of/),
];

/** Rows the backends disagree on today: each states the agreed outcome. */
const DISAGREE_ACCEPT: readonly Row[] = [
	accept("swapping typed-array state, s.a = s.b", "s.a = s.b; o.out = s.a[0]"),
	accept("the state record in a const, const t = s", "const t = s; t.n++; o.out = t.n % 3"),
	accept("a typed array in a let, let a = s.buf", "let a = s.buf; a[0] = i.in; o.out = a[0]"),
	accept("a let rebound to another typed array", "let a = s.a; a = s.b; o.out = a[0]"),
	accept("a config string in a let, let m = cfg.mode", 'let m = cfg.mode; o.out = m === "a" ? 1 : 0'),
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
	accept("&&= on an element", "s.buf[0] = 1; s.buf[0] &&= i.in; o.out = s.buf[0]"),
	accept("||= on an element", "s.buf[1] ||= i.in; o.out = s.buf[1]"),
	accept("??= on an element", "s.buf[2] ??= i.in; o.out = s.buf[2]"),
	accept("&&= on a local", "let a = 1; a &&= i.in; o.out = a"),
	accept("typeof of an in-range element", 'o.out = typeof s.buf[0] === "number" ? 1 : 0'),
	// Found by generated-ticks: an out-of-range read is undefined in JS and NaN on WASM.
	accept("an out-of-range read used as an index", "o.out = s.buf[s.buf[9]] ?? 1"),
	accept("an out-of-range read as an exponent", "o.out = 1 ** s.buf[5]"),
];

const DISAGREE_REJECT: readonly Row[] = [
	reject("writing the state parameter, s = 0", "s = 0; o.out = 1"),
	reject("writing the inputs parameter, i = 0", "i = 0; o.out = 1"),
	reject("writing the outputs parameter, o = 0", "o = 0"),
	reject("writing the config parameter, cfg = 0", "cfg = 0; o.out = 1"),
];

function expectAccepted(row: Row): void {
	expectIdentical(evalPatch(patch(row.body, row.helpers)), SAMPLES);
}

function expectRejected(row: Row): void {
	expect(() => evalPatch(patch(row.body, row.helpers))).toThrow(row.message ?? /./);
}

describe("tick forms: both backends agree", () => {
	for (const row of AGREED_ACCEPT) it(`accept: ${row.what}`, () => expectAccepted(row));
	for (const row of AGREED_REJECT) it(`reject: ${row.what}`, () => expectRejected(row));
});

describe("tick forms the backends disagree on today", () => {
	for (const row of DISAGREE_ACCEPT) it.fails(`accept: ${row.what}`, () => expectAccepted(row));
	for (const row of DISAGREE_REJECT) it.fails(`reject: ${row.what}`, () => expectRejected(row));
});
