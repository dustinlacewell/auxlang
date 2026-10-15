/**
 * White noise. `Math.random()` in a tick is the lane's seeded stream, seeded
 * from (patch seed, node identity, lane), so every instance and every lane
 * differs and re-eval continues the stream. Output is uniform in [min, max].
 */
defmod({
	name: "noise",
	category: "sources",
	doc: "White noise.",
	ins: { min: sig(-1), max: sig(1) },
	outs: { out: sig() },
	defaultIn: "min",
	defaultOut: "out",
	tick: (s, i, o) => {
		o.out = i.min + Math.random() * (i.max - i.min);
	},
});
