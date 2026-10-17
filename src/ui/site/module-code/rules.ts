/**
 * The module-code page's content: a skeleton defmod and the rule tables.
 * Each row is [form, what happens]. Keep rows to one line of rule.
 */

export const SKELETON = `function wrapIndex(k, n) { return ((Math.floor(k) % n) + n) % n }

defmod("echo", { cat: "effects" }, ({ sr }) => {
  const buf = new Float64Array(sr)
  let w = 0
  return ({ in: x = 0, time = secs(0.25) }) => {
    const y = x + buf[wrapIndex(w - time * sr, buf.length)] * 0.5
    buf[w] = y
    w = (w + 1) % buf.length
    return y
  }
})
tri(60).echo().gain(0.2).out()`;

export interface RuleTopic {
	title: string;
	note?: string;
	rows: readonly (readonly [string, string])[];
}

export const RULES: readonly RuleTopic[] = [
	{
		title: "Shape",
		note: "Setup runs once per voice and builds its memory. The tick it returns runs every sample.",
		rows: [
			["({ sr, shape = \"sin\" }) => {...}", "Setup's parameters are sr, width (reduce modules) and config, each with its default."],
			["let w = 0  const buf = new Float64Array(n)", "A setup local — number, boolean, typed array, record — is the voice's memory."],
			["return ({ in: x = 0, time = secs(0.25) }) => ...", "The tick's parameters name the inputs; a default sets the port's value, a unit tag its unit."],
			["fb = range(0.5, 0, 1)", "A range gives a dragged number or knob its travel."],
			["return y   return { l, r }", "A tick's return value is its output: one value is out; a record names several."],
			["function wrapIndex(k, n) { ... }", "A same-file top-level function is a helper, written alongside the module."],
		],
	},
	{
		title: "Names",
		rows: [
			["Math.sin(x)", "Math members are auxlang's own versions, so both engines agree. An unknown name lists the ones that exist."],
			["const m = Math", "Math is used only as Math.name."],
			["s.buf.fill(0)", "Only Math.*, your helpers, hashRandom(key) and the array methods below can be called."],
		],
	},
	{
		title: "Setup builds the memory",
		note: "Setup allocates; the tick reads and writes what setup built. Sizes never change after setup runs.",
		rows: [
			["new Float64Array(n)  { a: 1 }  [1, 2]", "Build typed arrays, records and arrays once, in setup."],
			["buf.length = 2", "Array lengths are fixed once setup has run."],
			["let zz = 1  // added later", "A tick reads and writes only the locals setup declared; add new memory in setup."],
		],
	},
	{
		title: "Locals, records and arrays",
		rows: [
			['const { a, b: bb } = v   const [x, y] = buf', "Destructuring reads each field or index, including nested patterns and a default."],
			["for (const v of voices) { v.x += 1 }", "for…of walks an array; break and continue work as usual."],
			['v["n"]', "A valid-identifier string key reads the same field as v.n."],
			["a?.b  a?.[i]  f?.()", "Optional chaining reads through: a path through memory, inputs or outputs is never null."],
			["x **= 2  x &&= 1  x ??= 0", "Compound assignment, including exponent and logical assignment."],
			["[a, b] = [b, a]", "The two-element swap idiom."],
			["buf.fill(0)  buf.set(other, 2)  buf.copyWithin(0, 2)  buf.forEach((v, k) => ...)", "These run in place as index loops — no new array is allocated."],
			["c ? voices[0] : voices[1]", "A ternary between two array/record addresses picks one to read or write."],
			["return c ? { l: a, r: b } : { l: b, r: a }", "A returned record chosen by a ternary lifts field by field, with no allocation."],
		],
	},
	{
		title: "Functions",
		rows: [
			["function lerp(a, b, t) { return a + (b - a) * t }", "A same-file top-level function is a helper; helpers may call each other, never in a cycle."],
			["const peek = (k) => buf[k % 4]", "A small arrow inside the tick reads the tick's own locals and params."],
			["function f(x, k = 0.5) { ... }", "A helper's own parameter default — a constant or an earlier param — fills in at a call that omits it."],
			["(a) => { s.n = a }", "A nested arrow may read a setup local; writing one is a loud error naming the arrow and the name."],
			["async  function*", "No async functions or generators."],
			["class  this  await  with  try  throw", "Not allowed. A tick never throws."],
			["recursion: f calls g calls f", "Not allowed, directly or through a cycle of helpers."],
		],
	},
	{
		title: "Control flow",
		rows: [
			["for (k = 0; k < n; k++)  while  do…while  switch  labels", "All allowed, alongside for…of."],
			["if (v > 0) return 1\nreturn 2", "An unbraced if-return keeps its branch; it does not fall through."],
			["let x\nx = 1", "An uninitialised let needs a value on every path before it is read, or give it a starting value."],
		],
	},
	{
		title: "Types",
		note: "A variable, field or output keeps the type of its first value: number, boolean, or array/record of one type and length.",
		rows: [
			["let x = 0\nx = true", "A boolean in a number variable is an error. Write cond ? 1 : 0."],
			["let a = buf\na = other", "Allowed if other has the same type and length."],
			["if (x)  !x  a && b", "Tests may mix numbers and booleans."],
			["buf[9] ?? 0.5", "?? reads a possibly out-of-range element, falling back to a plain value."],
			['typeof x === "number"', "typeof only inside a comparison."],
			["10n  /re/", "No BigInt, no regular expressions."],
		],
	},
	{
		title: "Strings",
		note: "Strings exist only while the module compiles. They come from config.",
		rows: [
			['cfg.mode === "fold"', "Allowed: compare a string."],
			["switch (cfg.mode)", "Allowed."],
			["const m = cfg.mode", "Allowed, if never reassigned."],
			['"a" + x', "No string building at run time."],
		],
	},
	{
		title: "Randomness",
		note: "Random values are seeded, so a patch sounds the same each time it plays.",
		rows: [
			["Math.random()", "The lane's seeded stream. Only in the tick."],
			["hashRandom(key)", "The same value each time the same key comes back. Only in the tick."],
		],
	},
];
