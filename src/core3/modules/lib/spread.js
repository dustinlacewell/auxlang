/**
 * Stereo spread: lane k of n sits at an even position across
 * [-amount, amount] — with amount 1, the first lane hard left, the last hard
 * right — with pan's constant-power law. A single lane sits in the center.
 *
 * A reducer: a map tick cannot see how many lanes there are, so spread takes
 * all lanes at once and sums them into one `l`/`r` pair by 1/√n, the same
 * mixdown `out` gives each stereo jack. Into `out` this sounds the same as
 * panning each lane on its own. `amount` reads lane 0 (a broadcast knob).
 *
 * A stereo module: chained or passed whole, it connects by name (`.out()`
 * wires l→l, r→r), and it has no default output (MANIFESTO §5).
 */
defmod({
	name: "spread",
	category: "effects",
	doc: "Spreads lanes evenly across the stereo field.",
	policy: "reduce",
	ins: { in: sig(0), amount: unit(1) },
	outs: { l: sig(), r: sig() },
	defaultIn: "in",
	positional: ["amount"],
	tick: (_s, ins, o) => {
		const lanes = ins.in;
		const amounts = ins.amount;
		const raw = typeof amounts === "number" ? amounts : (amounts[0] ?? 1);
		const amount = Math.max(0, Math.min(1, raw));
		const n = typeof lanes === "number" ? 1 : lanes.length;
		let l = 0;
		let r = 0;
		for (let k = 0; k < n; k++) {
			const v = typeof lanes === "number" ? lanes : lanes[k];
			const pos = n === 1 ? 0 : amount * ((2 * k) / (n - 1) - 1);
			const theta = ((pos + 1) / 2) * (Math.PI / 2);
			l += v * Math.cos(theta);
			r += v * Math.sin(theta);
		}
		const norm = 1 / Math.sqrt(n);
		o.l = l * norm;
		o.r = r * norm;
	},
});
