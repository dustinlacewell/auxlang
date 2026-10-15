/**
 * A tick's parameter records for one node lane, resolved to the render
 * function's locals: state fields and outputs are memory mirrors, inputs are
 * what the engine's bindings say (a constant, the value slot of an upstream
 * output this sample, or of any output last sample) and, for a reducer, the
 * f32 view its lanes are gathered into.
 */

import type { AnyNode } from "acorn";
import { BIND_CONST, BIND_CUR, BIND_PREV, type LaneBindings } from "../../runtime/bindings";
import { GATHER_CONST, GATHER_CUR, GATHER_PREV } from "../../runtime/gathers";
import type { NodeRun } from "../../runtime/node-run";
import type { TickRoles } from "../compile/emit-context";
import type { FnEmitter } from "../compile/fn-emitter";
import { type StaticValue, type Value, fixed, local } from "../compile/values";
import type { NodeMemory } from "./memory-layout";
import type { ValueSlots } from "./value-slots";

export function laneRoles(
	e: FnEmitter,
	run: NodeRun,
	memory: NodeMemory,
	lane: number,
	slots: ValueSlots,
	mirror: (addr: number) => number,
): TickRoles {
	const laneMemory = memory.lanes[lane];
	if (laneMemory === undefined) throw new Error(`wasm: no memory for lane ${lane}`);
	return {
		state: (field, at) => mirror(known(e, laneMemory.state, field, "state field", at)),
		output: (port, at) => mirror(known(e, memory.outs, port, "output", at)),
		input: (port, at) =>
			run.bindings === null
				? gathered(e, run, memory, port, at)
				: bound(e, run.bindings[lane], port, slots, at),
		config: (field, at) => configValue(e, run.config[field], field, at),
	};
}

function bound(
	e: FnEmitter,
	b: LaneBindings | undefined,
	port: string,
	slots: ValueSlots,
	at: AnyNode,
): Value {
	const j = b?.names.indexOf(port) ?? -1;
	if (b === undefined || j < 0) return e.fail(at, `unknown input '${port}'`);
	const kind = b.kinds[j];
	const offset = b.offsets[j] as number;
	if (kind === BIND_CONST) return fixed(b.consts[j] as number);
	if (kind === BIND_CUR) return local(slots.current(offset), "f64");
	if (kind === BIND_PREV) return local(slots.previous(offset), "f64");
	return e.fail(at, "signal lambdas are not supported by the WASM spike");
}

function gathered(
	e: FnEmitter,
	run: NodeRun,
	memory: NodeMemory,
	port: string,
	at: AnyNode,
): Value {
	const p = run.gathers?.ports.find((g) => g.name === port);
	if (p === undefined) return e.fail(at, `unknown input '${port}'`);
	if (p.kind === GATHER_CONST) return fixed(p.constValue);
	if (p.kind === GATHER_CUR || p.kind === GATHER_PREV)
		return { k: "lanes", lanes: { addr: memory.views[port] as number, length: p.srcLanes } };
	return e.fail(at, "signal lambdas are not supported by the WASM spike");
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
