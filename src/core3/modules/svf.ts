import type { ModuleSpec } from "../types";
import { hz, sig, unit } from "../types";
import { defineMap } from "./define-typed";

/**
 * State-variable filter (lpf/hpf/bpf/notch) — ONE Zavalishin/TPT core, four mode
 * wrappers selecting which of the {lp, bp, hp} taps (or the notch = lp+hp sum)
 * to emit.
 *
 * res→Q is a single shared mapping: Q = 0.5 + res*9.5 (res 0 → Q 0.5, res 1 → Q 10).
 * cutoff is clamped to 0.49*sr. Coefficients (g, k, a1, a2, a3) are recomputed
 * only when cutoff or res changed since the last sample (cached in state).
 */

type Mode = "lp" | "hp" | "bp" | "notch";

function createSvf(name: string, mode: Mode): ModuleSpec {
	return defineMap({
		name,
		ins: { in: sig(0), cutoff: hz(1000), res: unit(0.2) },
		outs: { out: sig() },
		defaultIn: "in",
		defaultOut: "out",
		positional: ["cutoff", "res"],
		config: { mode },
		state: () => ({ ic1: 0, ic2: 0, lastCut: -1, lastRes: -1, a1: 0, a2: 0, a3: 0, k: 0 }),
		tick: (s, i, o, cfg, sr) => {
			const cutoff = Math.min(i.cutoff, 0.49 * sr);
			const res = i.res;
			if (cutoff !== (s.lastCut as number) || res !== (s.lastRes as number)) {
				const g = Math.tan((Math.PI * cutoff) / sr);
				const k = 1 / (0.5 + res * 9.5);
				const a1 = 1 / (1 + g * (g + k));
				s.k = k;
				s.a1 = a1;
				s.a2 = g * a1;
				s.a3 = g * (g * a1);
				s.lastCut = cutoff;
				s.lastRes = res;
			}
			const ic1 = s.ic1 as number;
			const ic2 = s.ic2 as number;
			const a1 = s.a1 as number;
			const a2 = s.a2 as number;
			const a3 = s.a3 as number;
			const v0 = i.in;
			const v3 = v0 - ic2;
			const v1 = a1 * ic1 + a2 * v3;
			const v2 = ic2 + a2 * ic1 + a3 * v3;
			s.ic1 = 2 * v1 - ic1;
			s.ic2 = 2 * v2 - ic2;
			const lp = v2;
			const bp = v1;
			const hp = v0 - (s.k as number) * v1 - v2;
			o.out =
				(cfg.mode as Mode) === "lp"
					? lp
					: (cfg.mode as Mode) === "hp"
						? hp
						: (cfg.mode as Mode) === "bp"
							? bp
							: lp + hp; // notch
		},
	});
}

export const lpf = createSvf("lpf", "lp");
export const hpf = createSvf("hpf", "hp");
export const bpf = createSvf("bpf", "bp");
export const notch = createSvf("notch", "notch");
