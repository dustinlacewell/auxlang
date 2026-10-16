/**
 * Test support: a seeded random tick-program generator. One seed gives one
 * patch: a module `gen` whose tick is a random program over the forms the
 * checker and WASM agree on today (locals, block shadowing, bounded loops,
 * switch, state fields, typed-array reads with and without `??`, in range and
 * out of range, records, Math, helpers, randomness), plus a few forms the
 * checker refuses (uninitialised `let`, `??` on a non-member) so refusal is
 * exercised too. Every loop is bounded and every record index is 0 or 1, so
 * the interpreter never throws.
 */

export function generatePatch(seed: number): string {
	const g = new Gen(mulberry32(seed));
	return patchAround(g.tickBody());
}

function patchAround(body: string): string {
	return `tempo(120)
const gen = defmod({
  name: "gen",
  category: "utils",
  ins: { in: sig(0), k: sig(0) },
  outs: { out: sig(), aux: sig() },
  defaultIn: "in",
  defaultOut: "out",
  config: { mode: "a" },
  state: () => ({ n: 0, acc: 0, buf: new Float64Array(4), f: new Float32Array(3), w: new Int32Array(2), v: { x: 0, y: 0 }, voices: [{ x: 0 }, { x: 0 }] }),
  helpers: {
    h1: (x, y) => x * y + 1,
    h2: (x) => h1(x, 2) - x,
    hs: (st, x) => { st.acc += x; return st.n },
  },
  tick: (s, i, o, cfg, sr) => {
${body}
  },
})
const g = seq("[c3,e3] <g3 a3>").gen({ k: lfo(300, -2, 2) })
g.add(g.aux).mul(0.01).out()`;
}

/** mulberry32: a small seeded generator. */
function mulberry32(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

interface Local {
	readonly name: string;
	readonly writable: boolean;
}

const ARITHMETIC = ["+", "-", "*", "/", "%", "**", "&", "|", "^", "<<", ">>", ">>>"];
const COMPARISON = ["<", ">", "<=", ">=", "===", "!=="];
const COMPOUND = ["+=", "-=", "*=", "/=", "%=", "|=", "&=", "^=", "<<=", ">>="];
const UNARY = ["-", "~", "+"];
const MATH1 = ["sin", "cos", "floor", "abs", "sqrt", "tanh", "exp", "log", "round", "sign", "trunc", "ceil"];
const MATH2 = ["min", "max", "pow", "atan2", "hypot"];
const ARRAYS: readonly [string, number][] = [["buf", 4], ["f", 3], ["w", 2]];
const MAX_EXPR_DEPTH = 3;
const MAX_STMT_DEPTH = 2;

class Gen {
	private readonly scopes: Local[][] = [[]];
	private next = 0;
	private hidden: string | undefined;

	constructor(private readonly rnd: () => number) {}

	tickBody(): string {
		const lines = [`    s.acc = hs(s, ${this.expr(1)}) * 0.5`];
		lines.push(...this.statements(4 + this.int(6), 0, "    "));
		lines.push(...this.refusedForm("    "));
		lines.push(`    o.out = ${this.expr(0)}`);
		return lines.join("\n");
	}

	private statements(count: number, depth: number, pad: string): string[] {
		const out: string[] = [];
		for (let k = 0; k < count; k++) out.push(...this.statement(depth, pad));
		return out;
	}

	private statement(depth: number, pad: string): string[] {
		const nested = depth < MAX_STMT_DEPTH;
		const r = this.rnd();
		if (r < 0.16) return this.letDeclaration(pad);
		if (r < 0.26) return this.assignLocal(pad);
		if (r < 0.38) return [`${pad}${this.stateTarget()} ${this.pick(["=", "+=", "-=", "*="])} ${this.expr(0)}`];
		if (r < 0.46) return [`${pad}${this.pick(["o.out", "o.aux"])} = ${this.expr(0)}`];
		if (r < 0.5) return [`${pad}hs(s, ${this.expr(1)})`];
		if (!nested) return [`${pad}s.n++`];
		if (r < 0.64) return this.ifElse(depth, pad);
		if (r < 0.74) return this.forLoop(depth, pad);
		if (r < 0.8) return this.whileLoop(depth, pad);
		if (r < 0.88) return this.switchOn(depth, pad);
		return this.shadowingBlock(depth, pad);
	}

	/** One program in ten ends with a form the checker refuses: an uninitialised `let`, or `??` on a non-member. */
	private refusedForm(pad: string): string[] {
		const r = this.rnd();
		if (r < 0.05) return [`${pad}let ${this.declare(true)}`];
		if (r < 0.1) return [`${pad}o.aux = ${this.local() ?? "i.in"} ?? 1`];
		return [];
	}

	/** The initialiser is drawn before the name exists, so it never reads its own binding. */
	private letDeclaration(pad: string): string[] {
		const init = this.expr(0);
		return [`${pad}let ${this.declare(true)} = ${init}`];
	}

	private assignLocal(pad: string): string[] {
		const target = this.writableLocal();
		if (target === undefined) return [`${pad}s.acc += ${this.expr(1)}`];
		return [`${pad}${target} ${this.pick(["=", ...COMPOUND])} ${this.expr(0)}`];
	}

	private ifElse(depth: number, pad: string): string[] {
		const lines = [`${pad}if (${this.cond(1)}) {`, ...this.block(depth, pad)];
		if (this.rnd() < 0.5) lines.push(`${pad}} else {`, ...this.block(depth, pad));
		lines.push(`${pad}}`);
		return lines;
	}

	private forLoop(depth: number, pad: string): string[] {
		const counter = this.fresh();
		this.scopes.push([{ name: counter, writable: false }]);
		const head = `${pad}for (let ${counter} = 0; ${counter} < ${1 + this.int(4)}; ${counter}++) {`;
		const body = this.statements(1 + this.int(3), depth + 1, `${pad}  `);
		if (this.rnd() < 0.3) body.push(`${pad}  if (${this.cond(1)}) ${this.pick(["break", "continue"])}`);
		this.scopes.pop();
		return [head, ...body, `${pad}}`];
	}

	private whileLoop(depth: number, pad: string): string[] {
		const counter = this.fresh();
		const head = [`${pad}let ${counter} = 0`, `${pad}while (${counter} < ${1 + this.int(3)}) {`];
		this.scopes.at(-1)?.push({ name: counter, writable: false });
		const body = this.block(depth, pad);
		return [...head, ...body, `${pad}  ${counter}++`, `${pad}}`];
	}

	private switchOn(depth: number, pad: string): string[] {
		const lines = [`${pad}switch ((${this.expr(1)}) & 3) {`];
		for (let c = 0; c < 3; c++) {
			lines.push(`${pad}  ${c === 2 ? "default" : `case ${c}`}: {`, ...this.block(depth + 1, `${pad}  `));
			lines.push(`${pad}  }`);
			if (this.rnd() < 0.6) lines.push(`${pad}  break`);
		}
		lines.push(`${pad}}`);
		return lines;
	}

	/** A block whose first const shadows an outer local when there is one. */
	private shadowingBlock(depth: number, pad: string): string[] {
		const name = this.local() ?? this.fresh();
		this.hidden = name; // inside the block the name is the new const, not yet initialised
		const init = this.expr(1);
		this.hidden = undefined;
		this.scopes.push([{ name, writable: false }]);
		const lines = [`${pad}{`, `${pad}  const ${name} = ${init}`];
		lines.push(...this.statements(1 + this.int(3), depth + 1, `${pad}  `), `${pad}}`);
		this.scopes.pop();
		return lines;
	}

	private block(depth: number, pad: string): string[] {
		this.scopes.push([]);
		const lines = this.statements(1 + this.int(3), depth + 1, `${pad}  `);
		this.scopes.pop();
		return lines;
	}

	private stateTarget(): string {
		const r = this.rnd();
		if (r < 0.2) return "s.n";
		if (r < 0.35) return "s.acc";
		if (r < 0.5) return this.pick(["s.v.x", "s.v.y"]);
		if (r < 0.65) return `s.voices[(${this.expr(2)}) & 1].x`;
		const [name, length] = this.pick(ARRAYS);
		return `s.${name}[${this.index(length)}]`;
	}

	private expr(depth: number): string {
		if (depth >= MAX_EXPR_DEPTH) return this.leaf();
		const r = this.rnd();
		const d = depth + 1;
		if (r < 0.3) return this.leaf();
		if (r < 0.5) return `(${this.expr(d)} ${this.pick(ARITHMETIC)} ${this.expr(d)})`;
		if (r < 0.56) return `(${this.pick(UNARY)}(${this.expr(d)}))`;
		if (r < 0.62) return `(${this.cond(d)} ? ${this.expr(d)} : ${this.expr(d)})`;
		if (r < 0.7) return `Math.${this.pick(MATH1)}(${this.expr(d)})`;
		if (r < 0.75) return `Math.${this.pick(MATH2)}(${this.expr(d)}, ${this.expr(d)})`;
		if (r < 0.8) return this.pick([`h1(${this.expr(d)}, ${this.expr(d)})`, `h2(${this.expr(d)})`]);
		if (r < 0.83) return `hashRandom(${this.expr(d)})`;
		if (r < 0.86) return `(cfg.mode === "a" ? ${this.expr(d)} : ${this.expr(d)})`;
		return this.arrayRead(d);
	}

	/** A test: booleans live only here, so no variable mixes booleans and numbers. */
	private cond(depth: number): string {
		const r = this.rnd();
		const d = depth + 1;
		if (depth >= MAX_EXPR_DEPTH || r < 0.5) return `(${this.expr(d)} ${this.pick(COMPARISON)} ${this.expr(d)})`;
		if (r < 0.6) return `!${this.cond(d)}`;
		if (r < 0.8) return `(${this.cond(d)} ${this.pick(["&&", "||"])} ${this.cond(d)})`;
		return this.expr(d);
	}

	/**
	 * With `??`, any index; without, an index known in range. A bare
	 * out-of-range read (undefined) disagrees today once it reaches `**`,
	 * Math.pow or an index, so the generator keeps it out (see the agreement table).
	 */
	private arrayRead(depth: number): string {
		const [name, length] = this.pick(ARRAYS);
		if (depth >= MAX_EXPR_DEPTH) return `s.${name}[${this.int(length)}]`;
		if (this.rnd() < 0.6) return `(s.${name}[${this.index(length)}] ?? ${this.literal()})`;
		return `s.${name}[${this.inRangeIndex(length)}]`;
	}

	/** In range, out of range, negative, masked, or any expression (fractions read undefined). */
	private index(length: number): string {
		const r = this.rnd();
		if (r < 0.3) return this.inRangeIndex(length);
		if (r < 0.5) return `${length + this.int(3)}`;
		if (r < 0.6) return "-1";
		return this.expr(2);
	}

	private inRangeIndex(length: number): string {
		return this.rnd() < 0.5 ? `${this.int(length)}` : `(${this.expr(2)}) & ${length === 4 ? 3 : 1}`;
	}

	private leaf(): string {
		const r = this.rnd();
		const local = this.local();
		if (r < 0.25 && local !== undefined) return local;
		if (r < 0.4) return this.literal();
		if (r < 0.5) return this.pick(["i.in", "i.k"]);
		if (r < 0.62) return this.pick(["s.n", "s.acc", "s.v.x", "s.v.y", "s.voices[0].x", "s.voices[1].x"]);
		if (r < 0.66) return "Math.random()";
		if (r < 0.69) return this.pick(["sr", "Math.PI", "Math.E"]);
		if (r < 0.72 && local !== undefined) return `(typeof ${local} === "number" ? 1 : 0)`;
		return this.literal();
	}

	private literal(): string {
		return this.pick(["0", "1", "2", "3", "(-1)", "0.5", "0.25", "7", "1e6", "(-3.75)", "255", "0.1"]);
	}

	private declare(writable: boolean): string {
		const name = this.fresh();
		this.scopes.at(-1)?.push({ name, writable });
		return name;
	}

	private fresh(): string {
		return `v${this.next++}`;
	}

	/** A visible local: the innermost binding of its name wins. */
	private local(): string | undefined {
		const all = this.visible();
		return all.length === 0 ? undefined : this.pick(all).name;
	}

	private writableLocal(): string | undefined {
		const all = this.visible().filter((l) => l.writable);
		return all.length === 0 ? undefined : this.pick(all).name;
	}

	private visible(): Local[] {
		const seen = new Map<string, Local>();
		for (const scope of this.scopes) for (const l of scope) seen.set(l.name, l);
		return [...seen.values()].filter((l) => l.name !== this.hidden);
	}

	private int(n: number): number {
		return Math.floor(this.rnd() * n);
	}

	private pick<T>(xs: readonly T[]): T {
		return xs[this.int(xs.length)] as T;
	}
}
