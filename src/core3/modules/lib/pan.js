/**
 * Constant-power panner. `pos` in [-1,1] (−1 hard-left, 0 center, +1 hard-right)
 * maps to an equal-power angle so l²+r² is preserved across the sweep. Policy is
 * "map" (per-lane): each lane produces its own {l, r} pair; stereo summing is the
 * `out` module's job.
 *
 * Stereo module: chained or passed whole, it connects by name (`.out()` wires
 * l→l, r→r). Into a destination without an l/r pair it is a loud error, since
 * one input would drop a channel (patch/stereo.ts). It declares no default
 * output (MANIFESTO §5).
 */
defmod({
	name: "pan",
	category: "effects",
	doc: "Constant-power stereo placement.",
	ins: { in: sig(0), pos: sig(0) },
	outs: { l: sig(), r: sig() },
	defaultIn: "in",
	positional: ["pos"],
	tick: (_s, i, o) => {
		const p = Math.max(-1, Math.min(1, i.pos));
		const theta = ((p + 1) / 2) * (Math.PI / 2);
		o.l = i.in * Math.cos(theta);
		o.r = i.in * Math.sin(theta);
	},
});
