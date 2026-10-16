/**
 * What a plan saw that the kind check (tick-subset/kinds/) judges, in walk
 * order: stores and steps with the type of their place, values that take
 * one of two paths where the value is kept, field accesses no state has,
 * arrays and records used as numbers, helper calls with the callee's
 * plan, and each `return`. The plan itself never fails.
 */

import type { AnyNode } from "acorn";
import type { FieldFault } from "./field-fault";
import type { FunctionPlan } from "./function-plan";
import type { Ty } from "./ty";

export type PlanEvent =
	/** `place = value`. */
	| { readonly k: "store"; readonly node: AnyNode; readonly place: Ty; readonly value: Ty }
	/** `place op= value`. */
	| { readonly k: "compound"; readonly node: AnyNode; readonly place: Ty }
	/** `place++`, `--place`. */
	| { readonly k: "step"; readonly node: AnyNode; readonly place: Ty }
	/** A kept value from one of two paths (`?:`, `&&`, `||`, `??`). */
	| { readonly k: "paths"; readonly node: AnyNode; readonly a: Ty; readonly b: Ty }
	/** A field access no state has (field-fault.ts). */
	| { readonly k: "field"; readonly node: AnyNode; readonly fault: FieldFault }
	/** An array or record, or a parameter record, as an operand of an arithmetic or comparison operator. */
	| { readonly k: "operand"; readonly node: AnyNode }
	| { readonly k: "call"; readonly plan: FunctionPlan };

export interface Returned {
	readonly at: AnyNode;
	/** The returned value's type; null for a bare `return;`. */
	readonly ty: Ty | null;
}
