/**
 * One WebAssembly function under construction: its code, its locals, the
 * value each variable and parameter holds, and the control depth that
 * `break`, `continue` and `return` branch against. Depths are absolute:
 * opening a block gives it depth + 1, and a branch to absolute depth d from
 * depth D is `br (D - d)`. Names mean what the front end resolved them to
 * (module/front/scope/resolve-bindings.ts): values are kept by binding.
 */

import type { AnyNode, Identifier } from "acorn";
import { type Binding, type Resolution, bindingDeclaredBy } from "../../module/front/scope/binding";
import type { FunctionPlan } from "../../module/front/types/function-plan";
import { type Range, rangeOf } from "../../module/front/types/int-range";
import type { Folded, Ty } from "../../module/front/types/ty";
import { CodeBuffer } from "../encode/code-buffer";
import { F64, I32, I64, OP } from "../encode/opcodes";
import { compilerBug } from "./compiler-bug";
import type { EmitContext } from "./emit-context";
import type { Kind, Value } from "./values";

/**
 * A statement `break`/`continue` can leave. `implicit`: a loop or switch,
 * which an unlabeled `break` leaves; a labeled block needs its label.
 */
export interface LabelTarget {
	readonly name: string | null;
	readonly implicit: boolean;
	readonly breakAt: number;
	readonly continueAt: number | null;
}

export const valueType = (kind: Kind): number =>
	kind === "f64" ? F64 : kind === "long" ? I64 : I32;

export class FnEmitter {
	code = new CodeBuffer();
	depth = 0;
	readonly labels: LabelTarget[] = [];
	private readonly localTypes: number[] = [];
	private bound = new Map<Binding, Value>();

	constructor(
		readonly params: readonly number[],
		public ctx: EmitContext,
	) {}

	/** The value types of the locals after the parameters. */
	get locals(): readonly number[] {
		return this.localTypes;
	}

	local(kind: Kind): number {
		this.localTypes.push(valueType(kind));
		return this.params.length + this.localTypes.length - 1;
	}

	/** Open a block, loop or if; returns its depth. */
	enter(op: number, result: Kind | null = null): number {
		this.code.open(op, result === null ? null : valueType(result));
		return ++this.depth;
	}

	else(): void {
		this.code.op(OP.else);
	}

	exit(): void {
		this.code.op(OP.end);
		this.depth--;
	}

	br(target: number): void {
		this.code.op(OP.br).u32(this.depth - target);
	}

	brIf(target: number): void {
		this.code.op(OP.brIf).u32(this.depth - target);
	}

	/** Run `emit` into a separate buffer: its bytes and its result, to place later. */
	capture<T>(emit: () => T): { bytes: number[]; value: T } {
		const outer = this.code;
		this.code = new CodeBuffer();
		try {
			const value = emit();
			return { bytes: this.code.bytes, value };
		} finally {
			this.code = outer;
		}
	}

	/** Run `emit` with no variable bound: one tick's names never reach another's. */
	unbound<T>(emit: () => T): T {
		const outer = this.bound;
		this.bound = new Map();
		try {
			return emit();
		} finally {
			this.bound = outer;
		}
	}

	/** What the front end resolved the name reference `id` to. */
	resolution(id: Identifier): Resolution | undefined {
		return this.ctx.fn?.scopes.references.get(id);
	}

	/** The value of the variable or parameter the reference `id` names. */
	valueOf(id: Identifier): Value | undefined {
		const r = this.resolution(id);
		return r?.k === "binding" ? this.bound.get(r.binding) : undefined;
	}

	/** The variable or parameter `id` declares holds `value` from here on. */
	bind(id: Identifier, value: Value): void {
		const fn = this.ctx.fn;
		const binding = fn === null ? undefined : bindingDeclaredBy(fn.scopes, id);
		if (binding === undefined) return this.fail(id, "a name the front end did not bind");
		this.bound.set(binding, value);
	}

	/** The node's value when it is known while compiling, from this function's plan. */
	fold(node: AnyNode): Folded | null {
		return this.planned(node).fold(node);
	}

	/** The node's type in this function's plan. */
	typeOf(node: AnyNode): Ty {
		return this.planned(node).typeOf(node);
	}

	/** The node's integer range in this function's plan; null when it may not be an integer. */
	range(node: AnyNode): Range | null {
		return rangeOf(this.typeOf(node));
	}

	private planned(node: AnyNode): FunctionPlan {
		const plan = this.ctx.plan;
		if (plan === null) return this.fail(node, "no plan to type against");
		return plan;
	}

	/** A compiler bug at `node` (compiler-bug.ts). */
	fail(node: AnyNode, message: string): never {
		const line = node.loc?.start.line;
		return compilerBug(`${this.ctx.owner}${line === undefined ? "" : ` line ${line}`}`, message);
	}
}
