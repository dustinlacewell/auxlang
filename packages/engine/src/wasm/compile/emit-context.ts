/**
 * What a function being compiled can reach beyond its own locals: the
 * tick's parameter records (roles), the math call cache, the helpers and
 * runtime functions it calls, bridge intrinsics, and how `return` leaves it.
 */

import type { AnyNode, Expression } from "acorn";
import type { FunctionIR } from "../../dsp/front/module/module-ir";
import type { FunctionPlan } from "../../dsp/front/types/function-plan";
import type { StaticValue } from "../../dsp/front/types/ty";
import type { Aggregate, RecordShape } from "../layout/state-shape";
import type { FnEmitter } from "./fn-emitter";
import type { Kind, Value } from "./values";

/** A tick's parameter records for one node lane. */
export interface TickRoles {
	/** State field `field`: the f64 local mirroring a number, or an array or record in memory. */
	state(field: string, at: AnyNode): Value;
	input(port: string, at: AnyNode): Value;
	/** Output `port`: the f64 local holding it, or an out-group's f64 array in memory. */
	output(port: string, at: AnyNode): Value;
	config(field: string, at: AnyNode): StaticValue;
	/** The whole state record, passed to a helper. */
	stateRecord(at: AnyNode): StateRecord;
}

/**
 * The lane's state as one record in memory at `address`. A tick keeps its
 * numeric fields in local mirrors; around a helper call that takes the
 * record, `flush` stores the mirrors to memory and `reload` loads them back.
 */
export interface StateRecord {
	readonly shape: RecordShape;
	readonly address: number;
	flush(): void;
	reload(): void;
}

/**
 * The math call cache (`__mc[slot]`, module/bind-math/cache-names.ts): a
 * tick keeps its slots in locals and passes its lane's cache address to the
 * helpers it calls; a helper reaches the cache in memory through that hidden
 * i32 parameter (`base`, a local).
 */
export type CacheAccess =
	| { readonly k: "locals"; readonly slot: (n: number) => number; readonly address: number }
	| { readonly k: "memory"; readonly base: number };

/** How `return` leaves: with a value (a helper), or by branching out of an inlined tick. */
export type Return =
	| { readonly k: "value"; readonly kind: Kind }
	| { readonly k: "exit"; readonly depth: number };

/**
 * A helper argument's shape: run-time values are parameters, the rest
 * specialise the helper. An array or record in memory specialises it on its
 * shape and offset; a `dynamic` one (inside an array of records at a
 * run-time index, or a tick's whole state record) passes its base address
 * as an i32 parameter.
 */
export type ArgShape =
	| { readonly k: "run"; readonly kind: "f64" | "bool" }
	| { readonly k: "static"; readonly value: StaticValue }
	| {
			readonly k: "memory";
			readonly shape: Aggregate;
			readonly offset: number;
			readonly dynamic: boolean;
	  };

export interface FnRef {
	readonly index: number;
	/** Takes the lane's cache base as a hidden first parameter. */
	readonly hidden: boolean;
	readonly result: Kind;
}

export interface Calls {
	hasHelper(name: string): boolean;
	helper(name: string, shapes: readonly ArgShape[]): FnRef;
	runtime(name: "toInt32" | "round" | "fmod" | "sign"): FnRef;
}

/** Bridge calls a module's own tick may make (the seq event table). */
export interface Intrinsics {
	/** Emits the call and returns its kind, "void", or null when `name` is not an intrinsic. */
	call(e: FnEmitter, name: string, args: readonly Expression[], at: AnyNode): Kind | "void" | null;
}

export interface EmitContext {
	readonly owner: string;
	/** The function being emitted, as the front end read it; null for the render function. */
	readonly fn: FunctionIR | null;
	/** That function's plan for this specialisation: each node's type and known value. */
	readonly plan: FunctionPlan | null;
	readonly roles: TickRoles | null;
	readonly cache: CacheAccess | null;
	readonly calls: Calls;
	readonly intrinsics: Intrinsics | null;
	readonly ret: Return;
}
