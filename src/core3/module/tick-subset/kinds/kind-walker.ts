/**
 * One function's statements, walked in order for the kind check: each
 * `const`/`let` takes the type of its initial value for its block, every
 * expression is typed (type-expression.ts), and the types of its `return`
 * values are collected.
 */

import type { AnyNode, Statement, VariableDeclaration } from "acorn";
import type { FunctionNode } from "@/core3/module/front/parse/parse-function";
import type { KindContext } from "./kind-context";
import { typeOf } from "./type-expression";
import { OTHER, type ValueType } from "./value-type";

export interface WalkedFunction {
	readonly node: FunctionNode;
	readonly fail: (node: AnyNode, message: string) => never;
}

export type HelperCall = (name: string, args: readonly ValueType[]) => ValueType | null;

export class KindWalker implements KindContext {
	private readonly scopes: Map<string, ValueType>[] = [];
	/** Each `return`'s type, with the statement. */
	readonly returns: { readonly type: ValueType; readonly at: AnyNode }[] = [];

	constructor(
		private readonly fn: WalkedFunction,
		private readonly helpers: HelperCall,
	) {}

	/** Walk the body with the parameters bound to `params` (missing ones are `undefined`). */
	run(params: readonly ValueType[]): this {
		const top = new Map<string, ValueType>();
		this.fn.node.params.forEach((p, k) => {
			if (p.type === "Identifier") top.set(p.name, params[k] ?? OTHER);
		});
		this.scopes.push(top);
		const body = this.fn.node.body;
		if (body.type === "BlockStatement") this.block(body.body);
		else this.returns.push({ type: typeOf(this, body, "value"), at: body });
		return this;
	}

	lookup(name: string): ValueType | undefined {
		for (let k = this.scopes.length - 1; k >= 0; k--) {
			const t = this.scopes[k]?.get(name);
			if (t !== undefined) return t;
		}
		return undefined;
	}

	fail(node: AnyNode, message: string): never {
		return this.fn.fail(node, message);
	}

	callHelper(name: string, args: readonly ValueType[]): ValueType | null {
		return this.helpers(name, args);
	}

	private block(body: readonly AnyNode[]): void {
		this.scopes.push(new Map());
		for (const s of body) this.statement(s);
		this.scopes.pop();
	}

	private statement(node: AnyNode): void {
		switch (node.type) {
			case "BlockStatement":
				this.block(node.body);
				return;
			case "ExpressionStatement":
				typeOf(this, node.expression, "loose");
				return;
			case "VariableDeclaration":
				this.declare(node);
				return;
			case "IfStatement":
				typeOf(this, node.test, "loose");
				this.statement(node.consequent);
				if (node.alternate) this.statement(node.alternate);
				return;
			case "ForStatement":
				this.scopes.push(new Map());
				if (node.init?.type === "VariableDeclaration") this.declare(node.init);
				else if (node.init) typeOf(this, node.init, "loose");
				if (node.test) typeOf(this, node.test, "loose");
				if (node.update) typeOf(this, node.update, "loose");
				this.statement(node.body);
				this.scopes.pop();
				return;
			case "WhileStatement":
			case "DoWhileStatement":
				typeOf(this, node.test, "loose");
				this.statement(node.body);
				return;
			case "SwitchStatement":
				typeOf(this, node.discriminant, "value");
				this.block(node.cases.flatMap((c) => this.caseBody(c.test, c.consequent)));
				return;
			case "ReturnStatement":
				this.returns.push({
					type: node.argument ? typeOf(this, node.argument, "value") : OTHER,
					at: node,
				});
				return;
			case "LabeledStatement":
				this.statement(node.body);
				return;
		}
	}

	/** A case's test is typed where it stands; its statements join the switch's one block. */
	private caseBody(test: AnyNode | null | undefined, body: readonly Statement[]): Statement[] {
		if (test) typeOf(this, test, "value");
		return [...body];
	}

	private declare(node: VariableDeclaration): void {
		const scope = this.scopes[this.scopes.length - 1] as Map<string, ValueType>;
		for (const d of node.declarations) {
			const type = d.init ? typeOf(this, d.init, "value") : OTHER;
			if (d.id.type === "Identifier") scope.set(d.id.name, type);
		}
	}
}
