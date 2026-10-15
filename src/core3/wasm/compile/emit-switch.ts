/**
 * `switch` with fall-through, as one block per case nested inside the exit
 * block. The innermost block holds the dispatch: the discriminant is compared
 * with each case in order (strict equality) and branches out of the block
 * whose end starts that case's body; then to `default`, or out. A known
 * discriminant with known cases branches straight to its case.
 *
 *   block $exit
 *     block $c(m-1) ... block $c0  dispatch  end  body0  ...  end  body(m-1)
 *   end
 */

import type { AnyNode, SwitchCase, SwitchStatement } from "acorn";
import { OP } from "../encode/opcodes";
import { combine } from "./emit-binary";
import { emitExpr } from "./emit-expression";
import { emitStatements } from "./emit-statement";
import type { FnEmitter } from "./fn-emitter";
import { staticOf } from "./static-value";

export function emitSwitch(e: FnEmitter, node: SwitchStatement, label: string | null): void {
	const cases = node.cases;
	const exit = e.enter(OP.block);
	const blocks = cases.map(() => e.enter(OP.block)).reverse();
	e.within(e.scope.child(), () => {
		dispatch(e, node, blocks, exit);
		e.labels.push({ name: label, implicit: true, breakAt: exit, continueAt: null });
		for (const c of cases) {
			e.exit();
			emitStatements(e, c.consequent);
		}
		e.labels.pop();
	});
	e.exit();
}

function dispatch(
	e: FnEmitter,
	node: SwitchStatement,
	blocks: readonly number[],
	exit: number,
): void {
	const cases = node.cases;
	const fallback = defaultBlock(cases, blocks) ?? exit;
	const known = knownCase(e, node);
	if (known !== undefined) {
		e.br(known === null ? fallback : (blocks[known] as number));
		return;
	}
	const kind = emitExpr(e, node.discriminant);
	const disc = e.local(kind === "bool" ? "bool" : kind === "int" ? "int" : "f64");
	e.code.set(disc);
	cases.forEach((c, k) => {
		if (c.test === null || c.test === undefined) return;
		const test = c.test;
		const left = e.capture(() => {
			e.code.get(disc);
			return kind;
		});
		const right = e.capture(() => emitExpr(e, test));
		combine(e, "===", left, right, c);
		e.brIf(blocks[k] as number);
	});
	e.br(fallback);
}

function defaultBlock(cases: readonly SwitchCase[], blocks: readonly number[]): number | null {
	const k = cases.findIndex((c) => c.test === null || c.test === undefined);
	return k < 0 ? null : (blocks[k] as number);
}

/** The matching case's index when everything is known (null: none matches); undefined otherwise. */
function knownCase(e: FnEmitter, node: SwitchStatement): number | null | undefined {
	const disc = staticOf(e, node.discriminant);
	if (disc === null) return undefined;
	for (let k = 0; k < node.cases.length; k++) {
		const test = (node.cases[k] as SwitchCase).test as AnyNode | null | undefined;
		if (test === null || test === undefined) continue;
		const value = staticOf(e, test);
		if (value === null) return undefined;
		if (value.v === disc.v) return k;
	}
	return null;
}
