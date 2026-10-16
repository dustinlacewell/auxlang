/**
 * The module-code page's content: a skeleton defmod and the rule tables.
 * Each row is [form, what happens]. Keep rows to one line of rule.
 */

export const SKELETON = `const wrapIndex = (k, n) => ((Math.floor(k) % n) + n) % n
defmod({
  name: "echo",
  category: "effects",
  ins: { in: sig(0), time: secs(0.25) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  state: (sr) => ({ buf: new Float64Array(sr), w: 0 }),
  helpers: { wrapIndex },
  tick: (s, i, o, cfg, sr) => {
    const r = wrapIndex(s.w - i.time * sr, s.buf.length)
    o.out = i.in + s.buf[r] * 0.5
    s.buf[s.w] = o.out
    s.w = (s.w + 1) % s.buf.length
  },
})
tri(60).echo().gain(0.2).out()`;

export interface RuleTopic {
	title: string;
	note?: string;
	rows: readonly (readonly [string, string])[];
}

export const RULES: readonly RuleTopic[] = [
	{
		title: "Names",
		rows: [
			[
				"outer",
				"No closures. A tick sees its parameters, its locals, Math, its helpers and hashRandom.",
			],
			[
				"Math.sin(x)",
				"Math members are auxlang's own versions, so both engines agree. An unknown name lists the ones that exist.",
			],
			["const m = Math", "Math is used only as Math.name."],
			["const f = helper", "Helpers are called, never kept as values."],
			["s.buf.fill(0)", "No method calls. Only Math.*, helpers and hashRandom(key) can be called."],
			["let x\nx = 1", "Every variable needs a start value: let x = 0."],
		],
	},
	{
		title: "Allocation",
		note: "Build every object and array once, in state(). The tick only reads and writes them.",
		rows: [
			["new Float64Array(n)", "Only in state()."],
			["{ a: 1 }  [1, 2]", "Object and array literals only in state()."],
			["`x${n}`  ...xs  { a } = r", "No template strings, spread or destructuring."],
			["(x) => x", "No nested functions. Put them in helpers."],
		],
	},
	{
		title: "State, records and arrays",
		note: "state() fixes the shape: numbers, nested records, typed arrays. Sizes never change.",
		rows: [
			["s.zz = 1", "Adding a field is an error. Declare it in state()."],
			["o.out = s.zz", "Reading a field that does not exist is an error, not undefined."],
			["s.buf.length = 2", "Array lengths are fixed."],
			['s.v[0]  s["n"]', "Record fields are named, never computed. Arrays take number indexes."],
			["s.buf + 1", "An array or record is not a number. Read an element or field."],
			[
				"s.a = s.b",
				"Allowed for arrays or records of the same type and length. Both names then share one array, as in JS.",
			],
			["const t = s", "Allowed. t is the same record. Write fields through it; never reassign t."],
			["s.voices[k].x += 1", "Allowed: write a field of a record in an array."],
			["delete  in  instanceof", "Not allowed. Shapes are fixed, so there is nothing to probe."],
		],
	},
	{
		title: "Writes",
		rows: [
			["s = 0  i = 0  cfg++", "The parameter records are never reassigned. Write their fields."],
			["i.in = 1", "Inputs and config are read-only, also through an alias."],
			["o[k] = 1", "Outputs are written by name: o.out."],
			["o.out = s", "A whole parameter record cannot be stored."],
			["sr = sr * 2", "Allowed. sr is a plain number parameter."],
			["x **= 2", "Not allowed. Write x = x ** 2."],
			["&&=  ||=  ??=", "Allowed. ??= only on an array element."],
		],
	},
	{
		title: "Types",
		note: "A variable, field or output keeps the type of its first value: number, boolean, or array/record of one type and length.",
		rows: [
			["let x = 0\nx = true", "A boolean in a number variable is an error. Write cond ? 1 : 0."],
			["let a = s.buf\na = s.other", "Allowed if s.other has the same type and length."],
			["if (x)  !x  a && b", "Tests may mix numbers and booleans."],
			["a[j] ?? 0", "?? works only directly on an element read, not on a local."],
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
			['"a" + i.in', "No string building at run time."],
		],
	},
	{
		title: "Functions",
		rows: [
			["helpers: { f, g }", "Helpers may call each other, never in a cycle. No recursion."],
			["f(s, s)", "Allowed. A helper can take a record or array, and write its fields."],
			["(p) => { p = q }", "Allowed if q has the same type and length as p."],
			["async  function*", "No async functions or generators."],
			[
				"({ a }) => a  (x = 1) => x",
				"Parameters are plain names: no destructuring, defaults or rest.",
			],
		],
	},
	{
		title: "Control flow",
		rows: [
			["for (k = 0; k < n; k++)", "Index loops, while, do…while, labels, switch: all allowed."],
			["for…of  for…in", "Not allowed. Use an index loop and fixed field names."],
			["try  throw", "Not allowed. A tick never throws."],
			["a?.b  f?.()", "No optional chaining. Shapes are fixed."],
			["class  this  await  with", "Not allowed."],
		],
	},
	{
		title: "Randomness",
		note: "Random values are seeded, so a patch sounds the same each time it plays.",
		rows: [
			["Math.random()", "The lane's seeded stream. Only in tick. Pass values to helpers."],
			["hashRandom(key)", "The same value each time the same key comes back. Only in tick."],
		],
	},
];
