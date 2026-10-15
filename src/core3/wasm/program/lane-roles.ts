/**
 * A tick's parameter records for one node lane, resolved to the render
 * function's locals: numeric state fields and outputs are memory mirrors,
 * typed arrays and records stay in memory, inputs are
 * what the engine's bindings say (a constant, the value slot of an upstream
 * output this sample, or of any output last sample, or a lambda's value this
 * sample) and, for a reducer, the f64 view its lanes are gathered into. The
 * whole state record, passed to a helper, is state-record.ts.
 */

import type { AnyNode } from "acorn";
import { BIND_CONST, BIND_CUR, BIND_PREV, type LaneBindings } from "../../runtime/bindings";
import { GATHER_CONST, GATHER_CUR, GATHER_PREV } from "../../runtime/gathers";
import type { NodeRun } from "../../runtime/node-run";
import type { TickRoles } from "../compile/emit-context";
import type { FnEmitter } from "../compile/fn-emitter";
import { type StaticValue, type Value, fixed, inMemory, local } from "../compile/values";
import type { LaneMemory, NodeMemory } from "./memory-layout";
import { stateRecord } from "./state-record";
import type { ValueSlots } from "./value-slots";

export function laneRoles(
	e: FnEmitter,
	run: NodeRun,
	memory: NodeMemory,
	lane: number,
	slots: ValueSlots,
	mirror: (addr: number) => number,
	lambdas: Readonly<Record<string, number>>,
): TickRoles {
	const laneMemory = memory.lanes[lane];
	if (laneMemory === undefined) throw new Error(`wasm: no memory for lane ${lane}`);
	return {
		state: (field, at) => stateField(e, laneMemory, field, mirror, at),
		output: (port, at) => mirror(known(e, memory.outs, port, "output", at)),
		input: (port, at) =>
			run.bindings === null
				? gathered(e, run, memory, port, lambdas, at)
				: bound(e, run.bindings[lane], port, slots, lambdas, at),
		config: (field, at) => configValue(e, run.config[field], field, at),
		stateRecord: () => stateRecord(e, laneMemory, mirror),
	};
}

/** A number is a local mirror; an array or record is in memory at its absolute address. */
function stateField(
	e: FnEmitter,
	lane: LaneMemory,
	field: string,
	mirror: (addr: number) => number,
	at: AnyNode,
): Value {
	const addr = lane.state[field];
	if (addr !== undefined) return local(mirror(addr), "f64");
	const aggregate = lane.aggregates[field];
	if (aggregate !== undefined)
		return inMemory(aggregate.shape, { base: null, offset: aggregate.offset });
	return e.fail(
		at,
		`state field '${field}' is unknown or has no memory form (a string, a boolean, records of differing shapes)`,
	);
}

function bound(
	e: FnEmitter,
	b: LaneBindings | undefined,
	port: string,
	slots: ValueSlots,
	lambdas: Readonly<Record<string, number>>,
	at: AnyNode,
): Value {
	const j = b?.names.indexOf(port) ?? -1;
	if (b === undefined || j < 0) return e.fail(at, `unknown input '${port}'`);
	const kind = b.kinds[j];
	const offset = b.offsets[j] as number;
	if (kind === BIND_CONST) return fixed(b.consts[j] as number);
	if (kind === BIND_CUR) return local(slots.current(offset), "f64");
	if (kind === BIND_PREV) return local(slots.previous(offset), "f64");
	return lambdaValue(e, lambdas, port, at);
}

function gathered(
	e: FnEmitter,
	run: NodeRun,
	memory: NodeMemory,
	port: string,
	lambdas: Readonly<Record<string, number>>,
	at: AnyNode,
): Value {
	const p = run.gathers?.ports.find((g) => g.name === port);
	if (p === undefined) return e.fail(at, `unknown input '${port}'`);
	if (p.kind === GATHER_CONST) return fixed(p.constValue);
	if (p.kind === GATHER_CUR || p.kind === GATHER_PREV)
		return inMemory(
			{ k: "array", type: "f64", length: p.srcLanes },
			{ base: null, offset: memory.views[port] as number },
		);
	return lambdaValue(e, lambdas, port, at);
}

/** The local this sample's lambda call left the input's value in (lambda-inputs.ts). */
function lambdaValue(
	e: FnEmitter,
	lambdas: Readonly<Record<string, number>>,
	port: string,
	at: AnyNode,
): Value {
	const index = lambdas[port];
	if (index === undefined) return e.fail(at, `input '${port}' has no lambda call`);
	return local(index, "f64");
}

function known(
	e: FnEmitter,
	fields: Readonly<Record<string, number>>,
	name: string,
	what: string,
	at: AnyNode,
): number {
	const addr = fields[name];
	if (addr === undefined) return e.fail(at, `unknown or non-numeric ${what} '${name}'`);
	return addr;
}

function configValue(e: FnEmitter, v: unknown, field: string, at: AnyNode): StaticValue {
	if (v === undefined || v === null || ["number", "string", "boolean"].includes(typeof v))
		return v as StaticValue;
	return e.fail(at, `config '${field}' is not a plain value`);
}
