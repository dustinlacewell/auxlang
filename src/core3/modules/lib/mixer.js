/**
 * Named-channel mixer: sums `ch[k] * level[k]` over an open channel group.
 * `level` mirrors `ch`'s members (`like: "ch"`) and defaults each to 1.
 */
defmod({
	name: "mixer",
	category: "utils",
	doc: "Sums named channels, each scaled by its own level (default 1).",
	ins: { ch: group(sig(0), { open: true }), level: group(unit(1), { like: "ch" }) },
	outs: { out: sig(0) },
	defaultIn: "ch",
	defaultOut: "out",
	tick: (s, i, o) => {
		let sum = 0;
		for (let k = 0; k < i.ch.length; k++) sum += i.ch[k] * i.level[k];
		o.out = sum;
	},
});
