/**
 * Everything about a new program that is pure, done ahead of the audio
 * thread (MANIFESTO §8): the re-eval match against the running program and
 * the migration keys (reeval-identities.ts), and the generated driver code
 * (codegen/emit-grouped-code.ts) as source strings and binding paths. The
 * code is generated against a plan built here from fresh states; the engine
 * that runs it is built the same way (build/), so every binding path finds
 * its value there. The result is plain data: the main thread posts it to the
 * worklet. Errors in the program (unknown modules, bad lambdas, conflicting
 * loop starts) throw here, before anything is sent.
 */

import type { KeyedIdentity, ModuleSpec, Program, Registry } from "../../types";
import { BUILD_CONFIG, type BuildConfig } from "../build/build-config";
import { buildRun } from "../build/build-run";
import { nodeBuildCost } from "../build/step-costs";
import { type DriverCode, emitGroupedCode } from "../codegen/emit-grouped-code";
import { GROUP_BUDGET } from "../codegen/group/group-budget";
import type { DriverOptions } from "../driver";
import { feedbackReads } from "../feedback";
import { freshNodeStates } from "../fresh-node-states";
import { buildOutputLayout, slotOf } from "../output-slots";
import { reevalIdentities } from "../reeval-identities";
import { TIER_CONFIG, type TierConfig } from "../tier/tier-config";
import type { WasmPrepared } from "./wasm-prepared";

export interface PreparedProgram {
	readonly program: Program;
	readonly sampleRate: number;
	/** Prepared against a running program: the engine takes over its state and time at the swap. */
	readonly continues: boolean;
	readonly identities: readonly KeyedIdentity[];
	/** [new node index, old key] for each node that takes over running state. */
	readonly paired: readonly (readonly [number, string])[];
	/** Estimated build cost of each node (build/step-costs.ts). */
	readonly nodeCosts: readonly number[];
	/** The driver that renders from the swap; null = the interpreter. */
	readonly primary: DriverCode | null;
	readonly build: BuildConfig;
	/** Phase 2, built and warmed after the swap and then switched to (tier/); null = none. */
	readonly tier: DriverCode | null;
	readonly tierConfig: TierConfig;
	/** The program compiled to WASM (prepare-wasm-program.ts); null = a JS engine. */
	readonly wasm: WasmPrepared | null;
}

export function prepareProgram(
	program: Program,
	registry: Registry,
	sampleRate: number,
	running: readonly KeyedIdentity[] | undefined,
	options: DriverOptions,
): PreparedProgram {
	const { identities, paired } = reevalIdentities(program.nodes, running);
	const layout = buildOutputLayout(program.nodes, registry);
	feedbackReads(program.nodes);
	const runs = program.nodes.map((node, i) => {
		const spec = registry.get(node.module) as ModuleSpec;
		const key = (identities[i] as KeyedIdentity).key;
		const states = freshNodeStates(node, spec, sampleRate, program.seed, key);
		return buildRun(node, i, spec, layout, states);
	});
	const taps = (port: string) => Int32Array.from(program.outs, (n) => slotOf(layout, n, port, 0));
	const plan = { runs, tapsL: taps("l"), tapsR: taps("r") };
	const budget = options.groupBudget ?? GROUP_BUDGET;
	const codegen = options.codegen ?? false;
	const tierUp = codegen && options.tierUp === true;
	return {
		program,
		sampleRate,
		continues: running !== undefined,
		identities,
		paired: [...paired],
		nodeCosts: runs.map(nodeBuildCost),
		primary: codegen
			? emitGroupedCode(plan, { paste: options.paste === true && !tierUp, budget })
			: null,
		build: options.build ?? BUILD_CONFIG,
		tier: tierUp ? emitGroupedCode(plan, { paste: true, budget }) : null,
		tierConfig: options.tier ?? TIER_CONFIG,
		wasm: null,
	};
}
