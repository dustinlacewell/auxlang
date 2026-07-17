import { defineModule } from "../module/define";
import { sig } from "../types";

/**
 * White noise via a seeded xorshift32 PRNG (no Math.random — determinism law).
 * The seed is `config.__seed`, injected by compile from the Program seed +
 * structural id; defaults to 1. Output is uniform in [min, max].
 */
export const noise = defineModule({
	name: "noise",
	ins: { min: sig(-1), max: sig(1) },
	outs: { out: sig() },
	defaultIn: "min",
	defaultOut: "out",
	config: { __seed: 1 },
	state: () => ({ x: 0, started: 0 }),
	tick: (s, i, o, cfg) => {
		let x = s.x as number;
		if ((s.started as number) === 0) {
			const seed = (cfg.__seed as number) | 0;
			x = seed === 0 ? 1 : seed >>> 0;
			s.started = 1;
		}
		// xorshift32
		x ^= x << 13;
		x ^= x >>> 17;
		x ^= x << 5;
		x >>>= 0;
		s.x = x;
		const r = x / 0xffffffff; // [0,1]
		o.out = i.min + r * (i.max - i.min);
	},
});
