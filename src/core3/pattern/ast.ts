/**
 * Pattern AST — patterns are pure serializable DATA, not closures.
 * Combinators construct nodes; `query` (interpreter) evaluates them.
 * This is what makes patterns hashable (state migration), serializable
 * (worklet transfer), and inspectable (visualization).
 *
 * Every op's semantics are a pure function of (ast, span, seed).
 * Randomness (`degrade`) hashes (seed, structural path, cycle) — never Math.random.
 */

import type { R } from "./rational";

/** fastcat child with a duration weight (`a@2` => weight 2). */
export interface WChild {
	readonly pat: Pat;
	readonly weight: R;
}

export type Pat =
	| { readonly op: "pure"; readonly value: number } // one event spanning each cycle
	| { readonly op: "silence" }
	| { readonly op: "fastcat"; readonly children: readonly WChild[] } // weighted subdivision of one cycle
	| { readonly op: "slowcat"; readonly children: readonly Pat[] } // one child per cycle, round-robin
	| { readonly op: "stack"; readonly children: readonly Pat[] } // simultaneous
	| { readonly op: "fast"; readonly factor: R; readonly child: Pat }
	| { readonly op: "slow"; readonly factor: R; readonly child: Pat }
	| { readonly op: "rev"; readonly child: Pat } // reverse within each cycle
	| { readonly op: "early"; readonly amount: R; readonly child: Pat } // shift earlier (rotate)
	| { readonly op: "late"; readonly amount: R; readonly child: Pat }
	| { readonly op: "iter"; readonly n: number; readonly child: Pat } // shift by i/n on cycle i
	| { readonly op: "ply"; readonly n: number; readonly child: Pat } // repeat each event n times in place
	| {
			readonly op: "euclid";
			readonly k: number;
			readonly steps: number;
			readonly rot: number;
			readonly child: Pat;
	  }
	| { readonly op: "degrade"; readonly prob: number; readonly child: Pat } // drop events with probability prob (seeded)
	| { readonly op: "add"; readonly amount: number; readonly child: Pat } // payload arithmetic
	| { readonly op: "mul"; readonly amount: number; readonly child: Pat }
	// every(n, f): `transformed` is f(child), applied at build time.
	// Query picks transformed when cycle % n === 0, else child.
	| { readonly op: "every"; readonly n: number; readonly child: Pat; readonly transformed: Pat }
	// Tie markers (from notation `a_b`): flag emitted events.
	| { readonly op: "tieNext"; readonly child: Pat }
	| { readonly op: "tiePrev"; readonly child: Pat }
	// Keep child events whose onset lands in a "true" (nonzero) region of bool.
	| { readonly op: "mask"; readonly bool: Pat; readonly child: Pat }
	// Emit an event at each true step of bool, sampling child's value there.
	| { readonly op: "struct"; readonly bool: Pat; readonly child: Pat }
	// Sample-and-hold child into n discrete steps per cycle.
	| { readonly op: "segment"; readonly n: number; readonly child: Pat }
	// Scale each event's whole duration by factor (gate length; clamps to [0,1]).
	| { readonly op: "clip"; readonly factor: number; readonly child: Pat }
	// every(n)-family with a rotating slice: cycle i applies f to slice i%n of n.
	| {
			readonly op: "chunk";
			readonly n: number;
			readonly child: Pat;
			readonly transformed: Pat;
	  }
	// Per-event probabilistic transform: keep f(child) with probability prob.
	| {
			readonly op: "sometimesBy";
			readonly prob: number;
			readonly child: Pat;
			readonly transformed: Pat;
	  }
	// Continuous 0..1 signal sampled at query time (rand is seeded S&H per cycle).
	| { readonly op: "signal"; readonly kind: SignalKind }
	// Map integer index events onto a per-slot chord-tone table (baked notes).
	// Slot for cycle c = tables[floor(c/per) mod tables.length]; index i picks
	// table[i mod len] + 12*floor(i/len) so indices past the top wrap up octaves.
	| {
			readonly op: "chordidx";
			readonly tables: readonly (readonly number[])[];
			readonly per: number;
			readonly child: Pat;
	  };

/** Continuous pattern generators, sampled wherever a value is needed. */
export type SignalKind = "rand" | "perlin" | "sine" | "saw" | "tri" | "isaw";

export type PatOp = Pat["op"];
