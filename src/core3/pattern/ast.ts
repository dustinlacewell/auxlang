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
	| { readonly op: "tiePrev"; readonly child: Pat };

export type PatOp = Pat["op"];
