import { defmod } from "../patch/defmod";
import { sig, unit } from "../types";

/**
 * Waveshaper: soft saturation via tanh drive. `amount` (0..1) sets how hard the
 * signal is pushed into the curve — 0 passes through clean, 1 is heavy
 * saturation. The tanh is normalized by the drive so level stays roughly
 * constant as `amount` rises; it fattens and rounds rather than just clipping.
 */
defmod({
	name: "shape",
	category: "effects",
	doc: "Soft-saturation waveshaper — tanh drive from clean to crunchy.",
	ins: { in: sig(0), amount: unit(0.3) },
	outs: { out: sig() },
	defaultIn: "in",
	defaultOut: "out",
	positional: ["amount"],
	tick: (_s, i, o) => {
		const amount = Math.max(0, Math.min(1, i.amount));
		if (amount === 0) {
			o.out = i.in; // clean passthrough — a waveshaper at 0 is identity
			return;
		}
		const drive = 1 + amount * 24;
		const shaped = Math.tanh(i.in * drive) / Math.tanh(drive);
		// Crossfade clean→shaped by amount so the onset of saturation is gradual
		// and amount just below the max isn't a discontinuity from the drive jump.
		o.out = i.in * (1 - amount) + shaped * amount;
	},
});
