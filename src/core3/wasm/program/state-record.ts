/**
 * A lane's whole state as one record in memory, for a tick that passes its
 * state to a helper: the numeric fields and the arrays and records, each at
 * its offset from the lowest of their addresses. Lanes laid out alike give
 * equal shapes, so one helper specialisation serves them all; the address
 * is passed at run time. The numeric fields' local mirrors go to memory
 * before the call and come back after it.
 */

import type { StateRecord } from "../compile/emit-context";
import type { FnEmitter } from "../compile/fn-emitter";
import type { Field, RecordShape } from "../layout/state-shape";
import type { LaneMemory } from "./memory-layout";
import { sizeOf } from "./state-layout";

export function stateRecord(
	e: FnEmitter,
	lane: LaneMemory,
	mirror: (addr: number) => number,
): StateRecord {
	const numbers = Object.entries(lane.state);
	const aggregates = Object.entries(lane.aggregates);
	const address = lowest([
		...numbers.map(([, addr]) => addr),
		...aggregates.map(([, f]) => f.offset),
	]);
	const mirrors = numbers.map(([, addr]) => ({ addr, local: mirror(addr) }));
	return {
		shape: recordShape(numbers, aggregates, address),
		address,
		flush: () => {
			for (const m of mirrors) e.code.i32Const(0).get(m.local).storeF64(m.addr);
		},
		reload: () => {
			for (const m of mirrors) e.code.i32Const(0).loadF64(m.addr).set(m.local);
		},
	};
}

function recordShape(
	numbers: readonly (readonly [string, number])[],
	aggregates: readonly (readonly [string, Field])[],
	address: number,
): RecordShape {
	const fields: Record<string, Field> = {};
	for (const [name, addr] of numbers)
		fields[name] = { offset: addr - address, shape: { k: "number" } };
	for (const [name, f] of aggregates) fields[name] = { offset: f.offset - address, shape: f.shape };
	const size = Math.max(0, ...Object.values(fields).map((f) => f.offset + sizeOf(f.shape)));
	return { k: "record", size, fields };
}

function lowest(addresses: readonly number[]): number {
	return addresses.length === 0 ? 0 : Math.min(...addresses);
}
