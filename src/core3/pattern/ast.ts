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

/** timecat child with a duration weight (`a@2` => weight 2). */
export interface WChild {
	readonly pat: Pat;
	readonly weight: R;
}

/** polymeter layer: the layer's own step count, fixed at build time. */
export interface Layer {
	readonly pat: Pat;
	readonly steps: R;
}

export type Pat =
	| { readonly op: "pure"; readonly value: number } // one note spanning each cycle
	| { readonly op: "silence" } // no events at all
	| { readonly op: "rest" } // one rest event spanning each cycle (`~`)
	// One tie event per lane 0..lanes-1 spanning each cycle (`_`): continues the note before.
	| { readonly op: "tie"; readonly lanes: number }
	// The child's notes become slides (`a_b`): new value, entered without a retrigger.
	| { readonly op: "slide"; readonly child: Pat }
	| { readonly op: "fastcat"; readonly children: readonly Pat[] } // equal subdivision of one cycle
	| { readonly op: "timecat"; readonly children: readonly WChild[] } // weighted subdivision of one cycle
	| { readonly op: "slowcat"; readonly children: readonly Pat[] } // one child per cycle, round-robin
	| { readonly op: "stack"; readonly children: readonly Pat[] } // simultaneous
	// Simultaneous layers; each plays layers[0].steps of its own steps per cycle.
	| { readonly op: "polymeter"; readonly layers: readonly Layer[] }
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
	| { readonly op: "degrade"; readonly prob: number; readonly child: Pat } // turn events into rests with probability prob (seeded)
	| { readonly op: "add"; readonly amount: number; readonly child: Pat } // payload arithmetic
	| { readonly op: "mul"; readonly amount: number; readonly child: Pat }
	// every(n, f): `transformed` is f(child), applied at build time.
	// Query picks transformed when cycle % n === 0, else child.
	| { readonly op: "every"; readonly n: number; readonly child: Pat; readonly transformed: Pat }
	// Child events whose onset lands outside a "true" (nonzero) region of bool become rests.
	| { readonly op: "mask"; readonly bool: Pat; readonly child: Pat }
	// A note at each true step of bool, sampling child's value there; a rest at each false step.
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
	  }
	// Assign the child's events to n lanes under a voice policy (§3.5).
	| {
			readonly op: "voices";
			readonly policy: VoicePolicy;
			readonly n: number;
			readonly child: Pat;
	  };

/** Continuous pattern generators, sampled wherever a value is needed. */
export type SignalKind = "rand" | "perlin" | "sine" | "saw" | "tri" | "isaw";

/** How `voices` assigns events to lanes. */
export type VoicePolicy = "packed";

export type PatOp = Pat["op"];
