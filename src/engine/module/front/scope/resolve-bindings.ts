/**
 * Resolve every name in one function through its block scopes, as JS does:
 * parameters and `var`s belong to the function; `let` and `const` to the
 * block, `for` head or `switch` that declares them, from the block's start
 * (a use before the declaration is still that binding — the name rule turns
 * it away). An unbound name falls through to the module's names
 * (unbound-name.ts). Nested functions and classes are not entered: the form
 * rule refuses them. A `let`/`const` pattern (`const { a, b } = rec`) declares
 * every name the pattern names, same as a plain identifier would — bind-sugar
 * lowers patterns away before the checker ever runs resolveBindings on real
 * author code, so this only matters to a caller reading the ORIGINAL AST
 * (tick-writes.ts, the shape-gated alias rule), where the pattern is still
 * there to resolve.
 */

import type { AnyNode, Identifier, Node as AcornNode, Pattern, VariableDeclaration } from "acorn";
import type { FunctionNode } from "@/engine/module/front/parse/parse-function";
import { eachChild } from "@/engine/module/front/parse/walk";
import type { Binding, BindingKind, Resolution, Scopes } from "./binding";
import { isReference } from "./is-reference";
import { unboundName } from "./unbound-name";

export function resolveBindings(fn: FunctionNode, helpers: ReadonlySet<string>): Scopes {
	return new Resolver(helpers).run(fn);
}

const OPAQUE = new Set([
	"ArrowFunctionExpression",
	"FunctionExpression",
	"FunctionDeclaration",
	"ClassExpression",
	"ClassDeclaration",
]);

class Resolver {
	private readonly stack: Map<string, Binding>[] = [];
	private readonly bindings: Binding[] = [];
	private readonly references = new Map<Identifier, Resolution>();

	constructor(private readonly helpers: ReadonlySet<string>) {}

	run(fn: FunctionNode): Scopes {
		const params = fn.params.map((p) =>
			p.type === "Identifier" ? this.declare(p, "param", null) : undefined,
		);
		const vars = varDeclarators(fn.body).map((d) => this.declare(d.id as Identifier, "var", d));
		this.stack.push(byName([...params, ...vars]));
		this.visit(fn.body, fn, "body");
		this.stack.pop();
		return { params, bindings: this.bindings, references: this.references };
	}

	private visit(node: AnyNode, parent: AnyNode | null, key: string | null): void {
		if (OPAQUE.has(node.type)) return;
		switch (node.type) {
			case "Identifier":
				if (isReference(parent, key)) this.references.set(node, this.lookup(node.name));
				return;
			case "VariableDeclarator":
				if (node.init) this.visit(node.init, node, "init");
				return;
			case "BlockStatement":
				this.scoped(node.body, () => this.children(node));
				return;
			case "ForStatement":
				this.scoped(node.init ? [node.init] : [], () => this.children(node));
				return;
			case "ForInStatement":
			case "ForOfStatement":
				this.scoped([node.left], () => this.children(node));
				return;
			case "SwitchStatement":
				this.visit(node.discriminant, node, "discriminant");
				this.scoped(
					node.cases.flatMap((c) => c.consequent),
					() => {
						for (const c of node.cases) this.visit(c, node, "cases");
					},
				);
				return;
			default:
				this.children(node);
		}
	}

	private children(node: AnyNode): void {
		eachChild(node, (child, key) => this.visit(child, node, key));
	}

	/** Run `body` inside a scope holding the `let`/`const` declared directly in `statements`. */
	private scoped(statements: readonly AnyNode[], body: () => void): void {
		const lexical: Binding[] = [];
		for (const s of statements) {
			if (s.type !== "VariableDeclaration" || s.kind === "var") continue;
			for (const d of s.declarations) this.declarePattern(d.id as Pattern, lexicalKind(s), d, lexical);
		}
		this.stack.push(byName(lexical));
		body();
		this.stack.pop();
	}

	/** Every name `pattern` names, declared with `kind`, all against the same `declarator` (bindingDeclaredBy matches by identifier, not by declarator, so a pattern's several names sharing one declarator is fine). */
	private declarePattern(
		pattern: Pattern,
		kind: BindingKind,
		declarator: Binding["declarator"],
		into: Binding[],
	): void {
		if (pattern.type === "Identifier") {
			into.push(this.declare(pattern, kind, declarator));
			return;
		}
		if (pattern.type === "AssignmentPattern") {
			this.declarePattern(pattern.left as Pattern, kind, declarator, into);
			return;
		}
		if (pattern.type === "ObjectPattern") {
			for (const prop of pattern.properties)
				this.declarePattern(
					(prop.type === "RestElement" ? prop.argument : prop.value) as Pattern,
					kind,
					declarator,
					into,
				);
			return;
		}
		if (pattern.type === "ArrayPattern") {
			for (const el of pattern.elements) {
				if (el === null) continue;
				this.declarePattern((el.type === "RestElement" ? el.argument : el) as Pattern, kind, declarator, into);
			}
		}
	}

	private declare(
		id: Identifier,
		kind: BindingKind,
		declarator: Binding["declarator"],
	): Binding {
		const binding: Binding = { name: id.name, kind, id, declarator };
		this.bindings.push(binding);
		return binding;
	}

	private lookup(name: string): Resolution {
		for (let k = this.stack.length - 1; k >= 0; k--) {
			const binding = this.stack[k]?.get(name);
			if (binding !== undefined) return { k: "binding", binding };
		}
		return unboundName(name, this.helpers);
	}
}

function lexicalKind(declaration: VariableDeclaration): BindingKind {
	return declaration.kind === "const" ? "const" : "let";
}

function byName(bindings: readonly (Binding | undefined)[]): Map<string, Binding> {
	const scope = new Map<string, Binding>();
	for (const b of bindings) if (b !== undefined) scope.set(b.name, b);
	return scope;
}

/** The `var` declarators anywhere in `body` (outside nested functions), hoisted to the function. */
function varDeclarators(body: AcornNode): VariableDeclaration["declarations"] {
	const found: VariableDeclaration["declarations"] = [];
	const visit = (node: AnyNode): void => {
		if (OPAQUE.has(node.type)) return;
		if (node.type === "VariableDeclaration" && node.kind === "var")
			for (const d of node.declarations) if (d.id.type === "Identifier") found.push(d);
		eachChild(node, visit);
	};
	visit(body as AnyNode);
	return found;
}
