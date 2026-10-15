/**
 * The reference node walk for one sample: an interpreted pass over the built
 * runs. Every node ticks from the same call site, dispatching on
 * binding/gather kinds per port. The WASM program (wasm/program/) must
 * match this bit for bit; interpret-block.ts turns it into the driver.
 */

import type { ReduceTickFn, TickFn } from "../types";
import { BIND_CONST, BIND_CUR, BIND_LAMBDA, type LaneBindings } from "./bindings";
import { GATHER_CONST, GATHER_CUR, GATHER_LAMBDA, type ReduceGathers } from "./gathers";
import type { LambdaSlot } from "./lambda";
import type { NodeRun } from "./node-run";

/** One sample of node work over the flipped buffers, at lambda time `time`. */
export type SampleWalk = (cur: Float64Array, prv: Float64Array, sr: number, time: number) => void;

export function interpretSample(runs: readonly NodeRun[]): SampleWalk {
	return (cur, prv, sr, time) => {
		for (let i = 0; i < runs.length; i++) {
			const r = runs[i] as NodeRun;
			if (r.gathers === null) tickMap(r, cur, prv, sr, time);
			else tickReduce(r, cur, prv, sr, time);
		}
	};
}

function tickMap(r: NodeRun, cur: Float64Array, prv: Float64Array, sr: number, time: number): void {
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
			} else v = prv[offsets[j] as number] as number;
			ins[names[j] as string] = v;
		}
		(r.tick as TickFn)(r.states[lane] as Record<string, unknown>, ins, outs, r.config, sr);
		for (let j = 0; j < outPorts.length; j++) {
			cur[(outBases[j] as number) + lane] = outs[outPorts[j] as string] as number;
		}
	}
}

function tickReduce(
	r: NodeRun,
	cur: Float64Array,
	prv: Float64Array,
	sr: number,
	time: number,
): void {
	const g = r.gathers as ReduceGathers;
	const ins = r.ins as Record<string, Float64Array | number>;
	const ports = g.ports;
	for (let j = 0; j < ports.length; j++) {
		const p = ports[j] as (typeof ports)[number];
		if (p.kind === GATHER_CONST) ins[p.name] = p.constValue;
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
