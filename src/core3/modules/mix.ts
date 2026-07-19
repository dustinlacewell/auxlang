import { defmod } from "../patch/defmod";
import { sig } from "../types";

/**
 * Sum all lanes of `in` to a single lane, scaled by 1/√width. Normalization is
 * purely a function of static width — NO per-sample active/zero-crossing counting
 * (that made the scale factor jump whenever a lane momentarily hit zero).
 */
defmod({
	name: "mix",
	category: "utils",
	doc: "Sums many signals down to one.",
	policy: "reduce",
	ins: { in: sig(0) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	tick: (_s, ins, o, _cfg, _sr, width) => {
		const lanes = ins.in;
		let sum = 0;
		if (typeof lanes === "number") sum = lanes;
		else for (let l = 0; l < width; l++) sum += lanes[l] ?? 0;
		o.out = sum / Math.sqrt(Math.max(1, width));
	},
});
