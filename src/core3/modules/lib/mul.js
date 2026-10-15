/** Multiply two signals. `vca` and `gain` are the amplitude-named aliases. */
for (const name of ["mul", "vca", "gain"]) {
	defmod({
		name,
		category: "utils",
		doc: "Multiplies two signals — amplitude control and VCAs.",
		ins: { in: sig(0), by: sig(1) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["by"],
		tick: (_s, i, o) => {
			o.out = i.in * i.by;
		},
	});
}
