/**
 * `for`, `while` and `do...while` as block/loop pairs:
 *
 *   block $break
 *     loop $top
 *       (test, or br_if $break when it fails)   -- for, while
 *       block $continue  body  end
 *       (update)                                -- for
 *       (br $top | test, br_if $top)            -- do...while tests last
 *     end
 *   end
 *
 * A `for` counter that is always an int32 (front/types/loop-counter.ts) is
 * an i32 local: its declaration's plan type has its range.
 */

import type { DoWhileStatement, ForStatement, WhileStatement } from "acorn";
import { OP } from "../encode/opcodes";
import { emitDeclaration } from "./emit-declaration";
import { emitDiscard } from "./emit-expression";
import { emitStatement } from "./emit-statement";
import { emitTest } from "./emit-test";
import type { FnEmitter } from "./fn-emitter";

type Loop = ForStatement | WhileStatement | DoWhileStatement;

export function emitLoop(e: FnEmitter, node: Loop, label: string | null): void {
	if (node.type === "ForStatement") emitInit(e, node);
	const exit = e.enter(OP.block);
	const top = e.enter(OP.loop);
	if (node.type !== "DoWhileStatement") exitUnless(e, node.test ?? null, exit);
	const next = e.enter(OP.block);
	e.labels.push({ name: label, implicit: true, breakAt: exit, continueAt: next });
	emitStatement(e, node.body);
	e.labels.pop();
	e.exit();
	if (node.type === "DoWhileStatement") repeatIf(e, node, top);
	else {
		if (node.type === "ForStatement" && node.update !== null && node.update !== undefined)
			emitDiscard(e, node.update);
		e.br(top);
	}
	e.exit();
	e.exit();
}

function emitInit(e: FnEmitter, node: ForStatement): void {
	const init = node.init;
	if (init === null || init === undefined) return;
	if (init.type === "VariableDeclaration") emitDeclaration(e, init);
	else emitDiscard(e, init);
}

/** Leave the loop when `test` is false; a missing or known-true test never leaves. */
function exitUnless(e: FnEmitter, test: Loop["test"] | null, exit: number): void {
	if (test === null || test === undefined) return;
	const known = e.fold(test);
	if (known !== null) {
		if (!known.v) e.br(exit);
		return;
	}
	emitTest(e, test);
	e.code.op(OP.i32Eqz);
	e.brIf(exit);
}

function repeatIf(e: FnEmitter, node: DoWhileStatement, top: number): void {
	const known = e.fold(node.test);
	if (known !== null) {
		if (known.v) e.br(top);
		return;
	}
	emitTest(e, node.test);
	e.brIf(top);
}
