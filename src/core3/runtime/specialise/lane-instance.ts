/**
 * A built node lane as the front end specialises its tick for it
 * (module/front/types/tick-instance.ts): the lane's fresh state, what each
 * input is bound to (bindings.ts for a map node, gathers.ts for a reducer),
 * the node's config, the sample rate and the reducer width.
 */

import type { LaneInput, TickInstance } from "@/core3/module/front/types/tick-instance";
import { BIND_CONST, BIND_LAMBDA, type LaneBindings } from "../bindings";
import { GATHER_CONST, GATHER_CUR, GATHER_LAMBDA, GATHER_PREV, type PortGather } from "../gathers";
import type { GroupView } from "../group-view";
import type { NodeRun } from "../node-run";

export function laneInstance(run: NodeRun, lane: number, sampleRate: number): TickInstance {
	const state = run.states[lane];
	if (state === undefined) throw new Error(`specialise: no state for lane ${lane}`);
	const inputs = run.bindings === null ? gatheredInputs(run) : boundInputs(run.bindings[lane]);
	for (const g of run.groups.ins) inputs[g.name] = { k: "group", length: g.ports.length };
	return {
		state,
		inputs,
		config: run.config,
		sampleRate,
		width: run.gathers?.width ?? 1,
		outGroups: outGroupLengths(run.groups.outs),
	};
}

function outGroupLengths(groups: readonly GroupView[]): Record<string, number> {
	const lengths: Record<string, number> = {};
	for (const g of groups) lengths[g.name] = g.ports.length;
	return lengths;
}

function boundInputs(b: LaneBindings | undefined): Record<string, LaneInput> {
	const inputs: Record<string, LaneInput> = {};
	b?.names.forEach((name, j) => {
		inputs[name] = boundInput(b.kinds[j] as number, b.consts[j] as number);
	});
	return inputs;
}

function boundInput(kind: number, value: number): LaneInput {
	if (kind === BIND_CONST) return { k: "const", v: value };
	return kind === BIND_LAMBDA ? LAMBDA : LIVE;
}

function gatheredInputs(run: NodeRun): Record<string, LaneInput> {
	const inputs: Record<string, LaneInput> = {};
	for (const port of run.gathers?.ports ?? []) inputs[port.name] = gatheredInput(port);
	return inputs;
}

function gatheredInput(port: PortGather): LaneInput {
	if (port.kind === GATHER_CONST) return { k: "const", v: port.constValue };
	if (port.kind === GATHER_CUR || port.kind === GATHER_PREV)
		return { k: "gathered", length: port.srcLanes };
	return port.kind === GATHER_LAMBDA ? LAMBDA : LIVE;
}

const LIVE: LaneInput = { k: "live" };
const LAMBDA: LaneInput = { k: "lambda" };
