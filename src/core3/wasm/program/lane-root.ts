/**
 * The types a node lane's tick is planned for (module/front/types/tick-root.ts),
 * read from the same bindings and memory as its roles (lane-roles.ts): a
 * constant input folds, a gathered input is an f64 array of the source
 * lanes, config folds, state is what the lane lays out in memory, the sample
 * rate and width are constants.
 */

import type { TickRoot } from "../../module/front/types/tick-root";
import { NUM, type RecordRef, type Ty, UNKNOWN, known } from "../../module/front/types/ty";
import { configTy } from "../../module/front/types/value-ty";
import { BIND_CONST, type LaneBindings } from "../../runtime/bindings";
import { GATHER_CONST, GATHER_CUR, GATHER_PREV } from "../../runtime/gathers";
import type { NodeRun } from "../../runtime/node-run";
import { shapeTy } from "../compile/shape-ty";
import type { LaneMemory, NodeMemory } from "./memory-layout";

export function laneRoot(
	run: NodeRun,
	memory: NodeMemory,
	lane: number,
	sampleRate: number,
	width: number,
): TickRoot {
	const laneMemory = memory.lanes[lane];
	if (laneMemory === undefined) throw new Error(`wasm: no memory for lane ${lane}`);
	return {
		state: (field) => stateTy(laneMemory, field),
		input: (port) =>
			run.bindings === null ? gatheredTy(run, port) : boundTy(run.bindings[lane], port),
		config: (field) => configTy(run.config[field]),
		stateRecord: stateRecordTy(laneMemory),
		sampleRate: known(sampleRate),
		width: known(width),
	};
}

function stateTy(lane: LaneMemory, field: string): Ty | undefined {
	if (lane.state[field] !== undefined) return NUM;
	const aggregate = lane.aggregates[field];
	return aggregate === undefined ? undefined : shapeTy(aggregate.shape);
}

function boundTy(b: LaneBindings | undefined, port: string): Ty {
	const j = b?.names.indexOf(port) ?? -1;
	if (b === undefined || j < 0) return UNKNOWN;
	// A slot this sample or last, or a lambda's value: a number at run time.
	return b.kinds[j] === BIND_CONST ? known(b.consts[j] as number) : NUM;
}

function gatheredTy(run: NodeRun, port: string): Ty {
	const p = run.gathers?.ports.find((g) => g.name === port);
	if (p === undefined) return UNKNOWN;
	if (p.kind === GATHER_CONST) return known(p.constValue);
	if (p.kind === GATHER_CUR || p.kind === GATHER_PREV)
		return { k: "ref", shape: { k: "array", type: "f64", length: p.srcLanes }, placed: false };
	return NUM;
}

/** The whole state as one record: what a helper taking `state` is planned for. */
function stateRecordTy(lane: LaneMemory): RecordRef {
	const fields: Record<string, Ty> = {};
	for (const name of Object.keys(lane.state)) fields[name] = NUM;
	for (const [name, f] of Object.entries(lane.aggregates)) fields[name] = shapeTy(f.shape);
	return { k: "record", fields };
}
