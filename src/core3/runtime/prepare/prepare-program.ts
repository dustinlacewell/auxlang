/**
 * Everything about a new program that is pure, done ahead of the audio
 * thread (MANIFESTO §8): the re-eval match against the running program and
 * the migration keys (reeval-identities.ts), and each node's estimated
 * build cost. The engine build (build/) runs from it: the interpreter's
 * engine, and the start values the WASM engine's memory is written from.
 * The result is plain data. Errors in the program (unknown modules, bad
 * lambdas, conflicting loop starts) throw here, before anything is built.
 */

import type { KeyedIdentity, ModuleSpec, Program, Registry } from "../../types";
import { buildRun } from "../build/build-run";
import { nodeBuildCost } from "../build/step-costs";
import { feedbackReads } from "../feedback";
import { freshNodeStates } from "../fresh-node-states";
import { buildOutputLayout } from "../output-slots";
import { reevalIdentities } from "../reeval-identities";

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
}

export function prepareProgram(
	program: Program,
	registry: Registry,
	sampleRate: number,
	running: readonly KeyedIdentity[] | undefined,
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
	return {
		program,
		sampleRate,
		continues: running !== undefined,
		identities,
		paired: [...paired],
		nodeCosts: runs.map(nodeBuildCost),
	};
}
