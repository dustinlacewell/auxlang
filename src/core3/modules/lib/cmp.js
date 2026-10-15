/** Comparators — each emits a 0/1 gate. gt/lt compare `in` against `than`, eq with tolerance. */
const comparator = {
	category: "utils",
	ins: { in: sig(0), than: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["than"],
};

defmod({
	...comparator,
	name: "gt",
	doc: "Emits a gate when the input is greater than the threshold.",
	tick: (_s, i, o) => {
		o.out = i.in > i.than ? 1 : 0;
	},
});

defmod({
	...comparator,
	name: "lt",
	doc: "Emits a gate when the input is less than the threshold.",
	tick: (_s, i, o) => {
		o.out = i.in < i.than ? 1 : 0;
	},
});

defmod({
	...comparator,
	name: "eq",
	doc: "Emits a gate when the input equals the threshold.",
	tick: (_s, i, o) => {
		o.out = Math.abs(i.in - i.than) < 1e-4 ? 1 : 0;
	},
});
