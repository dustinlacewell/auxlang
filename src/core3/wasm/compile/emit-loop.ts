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
 */

import type { DoWhileStatement, ForStatement, WhileStatement } from "acorn";
import { OP } from "../encode/opcodes";
import { toBool } from "./coerce";
import { emitDiscard, emitExpr } from "./emit-expression";
import { emitStatement } from "./emit-statement";
import type { FnEmitter } from "./fn-emitter";
import { staticOf } from "./static-value";

type Loop = ForStatement | WhileStatement | DoWhileStatement;

export function emitLoop(e: FnEmitter, node: Loop, label: string | null): void {
	e.within(e.scope.child(), () => {
		if (node.type === "ForStatement" && node.init !== null && node.init !== undefined) {
			if (node.init.type === "VariableDeclaration") emitStatement(e, node.init);
			else emitDiscard(e, node.init);
		}
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
	});
}

/** Leave the loop when `test` is false; a missing or known-true test never leaves. */
function exitUnless(e: FnEmitter, test: Loop["test"] | null, exit: number): void {
	if (test === null || test === undefined) return;
	const known = staticOf(e, test);
	if (known !== null) {
		if (!known.v) e.br(exit);
		return;
	}
	toBool(e, emitExpr(e, test));
	e.code.op(OP.i32Eqz);
	e.brIf(exit);
}

function repeatIf(e: FnEmitter, node: DoWhileStatement, top: number): void {
	const known = staticOf(e, node.test);
	if (known !== null) {
		if (known.v) e.br(top);
		return;
	}
	toBool(e, emitExpr(e, node.test));
	e.brIf(top);
}
