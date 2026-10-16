/**
 * The reference node walk for one sample: an interpreted pass over the built
 * runs. Every node ticks from the same call site, dispatching on
 * binding/gather kinds per port. The WASM program (wasm/program/) must
 * match this bit for bit; interpret-block.ts turns it into the driver.
 */

import type { ReduceTickFn, TickFn } from "../types";
import { BIND_CONST, BIND_CUR, BIND_LAMBDA, BIND_SLOT, type LaneBindings } from "./bindings";
import { GATHER_CONST, GATHER_CUR, GATHER_LAMBDA, GATHER_SLOT, type ReduceGathers } from "./gathers";
import type { GroupView } from "./group-view";
import type { LambdaSlot } from "./lambda";
import type { NodeRun } from "./node-run";

/** One sample of node work over the flipped buffers and the live slots, at lambda time `time`. */
export type SampleWalk = (
	cur: Float64Array,
	prv: Float64Array,
	slots: Float64Array,
	sr: number,
	time: number,
) => void;

export function interpretSample(runs: readonly NodeRun[]): SampleWalk {
	return (cur, prv, slots, sr, time) => {
		for (let i = 0; i < runs.length; i++) {
			const r = runs[i] as NodeRun;
			if (r.gathers === null) tickMap(r, cur, prv, slots, sr, time);
			else tickReduce(r, cur, prv, slots, sr, time);
		}
	};
}

function tickMap(
	r: NodeRun,
	cur: Float64Array,
	prv: Float64Array,
	slots: Float64Array,
	sr: number,
	time: number,
): void {
	const bindings = r.bindings as readonly LaneBindings[];
	const ins = r.ins;
	const outs = r.outs;
	const outPorts = r.outPorts;
	const outBases = r.outBases;
	for (let lane = 0; lane < r.laneCount; lane++) {
		const b = bindings[lane] as LaneBindings;
		const names = b.names;
		const kinds = b.kinds;
		const offsets = b.offsets;
		const consts = b.consts;
		for (let j = 0; j < names.length; j++) {
			const k = kinds[j];
			let v: number;
			if (k === BIND_CONST) v = consts[j] as number;
			else if (k === BIND_CUR) v = cur[offsets[j] as number] as number;
			else if (k === BIND_LAMBDA) {
				const slot = b.lambdas[j] as LambdaSlot;
				v = slot.fn(slot.state, sr, time);
			} else if (k === BIND_SLOT) v = slots[offsets[j] as number] as number;
			else v = prv[offsets[j] as number] as number;
			ins[names[j] as string] = v;
		}
		for (const g of r.groups.ins) fillGroupView(g, ins);
		for (const g of r.groups.outs) placeGroupView(g, outs);
		(r.tick as TickFn)(r.states[lane] as Record<string, unknown>, ins, outs, r.config, sr);
		for (const g of r.groups.outs) drainGroupView(g, outs);
		for (let j = 0; j < outPorts.length; j++) {
			cur[(outBases[j] as number) + lane] = outs[outPorts[j] as string] as number;
		}
	}
}

/** `i.g[k] = ins[ports[k]]`, before the lane's tick reads the group. */
function fillGroupView(g: GroupView, ins: Record<string, number>): void {
	const view = g.view;
	const ports = g.ports;
	for (let k = 0; k < ports.length; k++) view[k] = ins[ports[k] as string] as number;
	ins[g.name] = view as unknown as number;
}

/** Hand the tick its out-group's view to write `o.g[k] = v` into, before it runs. */
function placeGroupView(g: GroupView, outs: Record<string, number>): void {
	outs[g.name] = g.view as unknown as number;
}

/** `outs[ports[k]] = o.g[k]`, after the tick writes the group, before out slots are read. */
function drainGroupView(g: GroupView, outs: Record<string, number>): void {
	const view = g.view;
	const ports = g.ports;
	for (let k = 0; k < ports.length; k++) outs[ports[k] as string] = view[k] as number;
}

function tickReduce(
	r: NodeRun,
	cur: Float64Array,
	prv: Float64Array,
	slots: Float64Array,
	sr: number,
	time: number,
): void {
	const g = r.gathers as ReduceGathers;
	const ins = r.ins as Record<string, Float64Array | number>;
	const ports = g.ports;
	for (let j = 0; j < ports.length; j++) {
		const p = ports[j] as (typeof ports)[number];
		if (p.kind === GATHER_CONST) ins[p.name] = p.constValue;
		else if (p.kind === GATHER_SLOT) ins[p.name] = slots[p.base] as number;
		else if (p.kind === GATHER_LAMBDA) {
			const slot = p.lambda as LambdaSlot;
			ins[p.name] = slot.fn(slot.state, sr, time);
		} else {
			const buf = p.kind === GATHER_CUR ? cur : prv;
			const view = p.view as Float64Array;
			const base = p.base;
			for (let l = 0; l < view.length; l++) view[l] = buf[base + l] as number;
			ins[p.name] = view;
		}
	}
	(r.tick as ReduceTickFn)(
		r.states[0] as Record<string, unknown>,
		ins,
		r.outs,
		r.config,
		sr,
		g.width,
	);
	const outPorts = r.outPorts;
	const outBases = r.outBases;
	for (let j = 0; j < outPorts.length; j++) {
		cur[outBases[j] as number] = r.outs[outPorts[j] as string] as number;
	}
}
