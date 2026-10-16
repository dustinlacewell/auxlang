/**
 * Pull a setup function's shape apart: its declared params (`sr`, `width`,
 * config keys with their literal defaults), the body's own statements, the
 * local names its top-level `const`/`let` declare (candidate state fields),
 * and the tick arrow it must end by returning.
 */

import type {
	AnyNode,
	ArrowFunctionExpression,
	FunctionExpression,
	ObjectPattern,
	Pattern,
	Statement,
} from "acorn";
export interface SetupConfigKey {
	readonly name: string;
	readonly def: number | string | boolean | null;
}

export interface SetupParams {
	readonly sr: boolean;
	readonly width: boolean;
	readonly config: readonly SetupConfigKey[];
}

export interface SetupParts {
	readonly params: SetupParams;
	readonly statements: readonly Statement[];
	readonly locals: readonly string[];
	readonly tick: ArrowFunctionExpression;
}

export function setupParts(
	setup: ArrowFunctionExpression | FunctionExpression,
	what: string,
): SetupParts {
	const params = setupParams(setup, what);
	const statements = bodyStatements(setup, what);
	const locals = topLevelLocals(statements);
	const tick = returnedTick(statements, what);
	return { params, statements, locals, tick };
}

function setupParams(setup: ArrowFunctionExpression | FunctionExpression, what: string): SetupParams {
	if (setup.params.length === 0) return { sr: false, width: false, config: [] };
	if (setup.params.length > 1 || setup.params[0]?.type !== "ObjectPattern") {
		throw new Error(`${what}: setup's single param must be destructured, e.g. ({ sr, taps = 3 }) => ...`);
	}
	const pattern = setup.params[0] as ObjectPattern;
	let sr = false;
	let width = false;
	const config: SetupConfigKey[] = [];
	for (const prop of pattern.properties) {
		if (prop.type !== "Property" || prop.key.type !== "Identifier") {
			throw new Error(`${what}: setup's param may only destructure plain names`);
		}
		const name = prop.key.name;
		if (name === "sr" && prop.value.type === "Identifier") {
			sr = true;
			continue;
		}
		if (name === "width" && prop.value.type === "Identifier") {
			width = true;
			continue;
		}
		if (prop.value.type === "Identifier") {
			config.push({ name, def: null });
			continue;
		}
		if (prop.value.type === "AssignmentPattern" && prop.value.left.type === "Identifier") {
			config.push({ name, def: configLiteral(prop.value.right, name, what) });
			continue;
		}
		throw new Error(`${what}: setup config key '${name}' must be a plain name, with or without a literal default`);
	}
	return { sr, width, config };
}

function configLiteral(node: AnyNode, name: string, what: string): number | string | boolean | null {
	if (node.type === "Literal") {
		const value = node.value;
		if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") return value;
	}
	if (node.type === "UnaryExpression" && node.operator === "-" && node.argument.type === "Literal") {
		const value = node.argument.value;
		if (typeof value === "number") return -value;
	}
	throw new Error(`${what}: config key '${name}' needs a literal default (number, string or boolean)`);
}

function bodyStatements(setup: ArrowFunctionExpression | FunctionExpression, what: string): readonly Statement[] {
	if (setup.body.type !== "BlockStatement") {
		throw new Error(`${what}: setup must have a block body ending in 'return (tick) => ...'`);
	}
	return setup.body.body;
}

function topLevelLocals(statements: readonly Statement[]): readonly string[] {
	const names: string[] = [];
	for (const stmt of statements) {
		if (stmt.type !== "VariableDeclaration") continue;
		for (const decl of stmt.declarations) collectNames(decl.id, names);
	}
	return names;
}

function collectNames(pattern: Pattern, out: string[]): void {
	if (pattern.type === "Identifier") {
		out.push(pattern.name);
		return;
	}
	if (pattern.type === "ObjectPattern") {
		for (const prop of pattern.properties) {
			if (prop.type === "RestElement") collectNames(prop.argument, out);
			else collectNames(prop.value, out);
		}
		return;
	}
	if (pattern.type === "ArrayPattern") {
		for (const el of pattern.elements) if (el !== null) collectNames(el, out);
		return;
	}
	if (pattern.type === "AssignmentPattern") {
		collectNames(pattern.left, out);
		return;
	}
	if (pattern.type === "RestElement") {
		collectNames(pattern.argument, out);
	}
}

function returnedTick(statements: readonly Statement[], what: string): ArrowFunctionExpression {
	const last = statements[statements.length - 1];
	if (
		last === undefined ||
		last.type !== "ReturnStatement" ||
		last.argument === null ||
		last.argument === undefined ||
		last.argument.type !== "ArrowFunctionExpression"
	) {
		throw new Error(`${what}: setup must end with 'return (ins) => ...', the module's tick`);
	}
	return last.argument;
}
