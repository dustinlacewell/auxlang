/**
 * One WebAssembly function under construction: its code, its locals, the
 * names in scope, and the control depth that `break`, `continue` and
 * `return` branch against. Depths are absolute: opening a block gives it
 * depth + 1, and a branch to absolute depth d from depth D is `br (D - d)`.
 */

import type { AnyNode } from "acorn";
import { CodeBuffer } from "../encode/code-buffer";
import { F64, I32, OP } from "../encode/opcodes";
import type { EmitContext } from "./emit-context";
import { Scope } from "./scope";
import type { Kind } from "./values";

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

export const valueType = (kind: Kind): number => (kind === "f64" ? F64 : I32);

export class FnEmitter {
	code = new CodeBuffer();
	depth = 0;
	scope: Scope;
	readonly labels: LabelTarget[] = [];
	private readonly localTypes: number[] = [];

	constructor(
		readonly params: readonly number[],
		public ctx: EmitContext,
		scope: Scope = new Scope(),
	) {
		this.scope = scope;
	}

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

	/** Run `emit` with `scope` in force. */
	within<T>(scope: Scope, emit: () => T): T {
		const outer = this.scope;
		this.scope = scope;
		try {
			return emit();
		} finally {
			this.scope = outer;
		}
	}

	fail(node: AnyNode, message: string): never {
		const line = node.loc?.start.line;
		throw new Error(
			`wasm: ${this.ctx.owner}${line === undefined ? "" : ` line ${line}`}: ${message}`,
		);
	}
}
