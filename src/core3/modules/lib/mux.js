/**
 * Switch between live cables by index: every palette member runs all the
 * time; `index` only ever picks which one reaches `out`. Index is truncated
 * to an integer; out of range (including negative) is 0. No table reading.
 */
defmod({
	name: "mux",
	category: "utils",
	doc: "Switches between palette members by index; out of range is 0.",
	ins: { index: sig(0), palette: sigs(0) },
	outs: { out: sig() },
	defaultIn: "index",
	defaultOut: "out",
	positional: ["index", "palette"],
	tick: (_s, i, o) => {
		const k = Math.trunc(i.index);
		o.out = k >= 0 && k < i.palette.length ? i.palette[k] : 0;
	},
});
