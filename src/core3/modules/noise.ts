import { defmod } from "../patch/defmod";
import { nextRandom } from "../random/next-random";
import { sig } from "../types";

/**
 * White noise from the lane's seeded random stream (no Math.random —
 * determinism law). The engine seeds each lane's stream from (patch seed,
 * node identity, lane), so every instance and every lane differs, and re-eval
 * continues the stream. Output is uniform in [min, max].
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
		o.out = i.min + nextRandom(s) * (i.max - i.min);
	},
});
