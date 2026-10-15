/**
 * The steps that build one generated driver (codegen/emit-grouped-code.ts):
 * compile each unit, then warm. Warming calls the shadow twin of each group
 * unit in run order and then the taps unit, `samples` samples each, once per
 * round: exactly a shadow block of that size. Rounds grow, so the first
 * calls (the costliest per sample, while V8 interprets) run the fewest
 * samples. Pure.
 */

import type { DriverCode } from "../codegen/emit-grouped-code";
import { BLOCK_MAX } from "../codegen/group/block-slots";
import { callCost, compileCost } from "./step-costs";

export type DriverStep =
	| { readonly k: "unit"; readonly unit: number; readonly cost: number }
	| { readonly k: "warm"; readonly unit: number; readonly samples: number; readonly cost: number };

export function driverSteps(code: DriverCode, rounds: readonly number[]): DriverStep[] {
	for (const samples of rounds) assertRound(samples);
	const compile: DriverStep[] = code.units.map((unit, i) => ({
		k: "unit",
		unit: i,
		cost: compileCost(unit),
	}));
	const called = code.units.flatMap((unit, i) => (unit.name === code.helpers ? [] : [i]));
	const warm: DriverStep[] = rounds.flatMap((samples, round) =>
		called.map((i) => ({
			k: "warm" as const,
			unit: i,
			samples,
			cost: callCost(code.units[i] as DriverCode["units"][number], samples, round === 0),
		})),
	);
	return [...compile, ...warm];
}

function assertRound(samples: number): void {
	if (Number.isInteger(samples) && samples >= 1 && samples <= BLOCK_MAX) return;
	throw new Error(`warm round of ${samples} samples: must be an integer from 1 to ${BLOCK_MAX}`);
}
