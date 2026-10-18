/**
 * Auxlang DSL formatter using Acorn AST.
 *
 * Rules:
 * 1. Chain breaks if: too long OR has .apply() OR has side-chain args OR has multiline objects
 * 2. When broken, each method gets its own line, indented +1 from root
 * 3. Objects break if too many props; closing } on last prop line
 * 4. Side-chains in args get newline + indent, then follow same rules
 * 5. Devices are normalized to their preferred style (positional, setters, config)
 */

import * as acorn from "acorn";
import { getDevice, isDeviceParam, type DeviceConfig } from "./devices.js";

// =============================================================================
// Types
// =============================================================================

type Node = acorn.Node & { [key: string]: unknown };

interface ChainPart {
	method: string;
	args: Node[] | null; // null for property access (no call)
}

interface Chain {
	root: Node;
	parts: ChainPart[];
}

// =============================================================================
// Format Rules
// =============================================================================

export interface FormatRules {
	indent: string;
	maxLineLength: number;
	maxInlineObjectProps: number;
}

const DEFAULT_RULES: FormatRules = {
	indent: "  ",
	maxLineLength: 60,
	maxInlineObjectProps: 3,
};

// =============================================================================
// Format Context
// =============================================================================

interface FormatContext {
	depth: number;
}

function indent(ctx: FormatContext): FormatContext {
	return { depth: ctx.depth + 1 };
}

function indentStr(ctx: FormatContext, rules: FormatRules): string {
	return rules.indent.repeat(ctx.depth);
}

// =============================================================================
// Main Entry Point
// =============================================================================

export function format(code: string, rules: Partial<FormatRules> = {}): string {
	const opts = { ...DEFAULT_RULES, ...rules };

	let ast: Node;
	try {
		ast = acorn.parse(code, {
			ecmaVersion: "latest",
			sourceType: "module",
		}) as Node;
	} catch {
		return code;
	}

	return formatNode(ast, { depth: 0 }, opts).trim();
}

// =============================================================================
// Node Dispatcher
// =============================================================================

function formatNode(node: Node, ctx: FormatContext, rules: FormatRules): string {
	switch (node.type) {
		case "Program":
			return (node.body as Node[]).map((s) => formatNode(s, ctx, rules)).join("\n\n");
		case "ExpressionStatement":
			return formatNode(node.expression as Node, ctx, rules);
		case "CallExpression":
			return formatCallExpression(node, ctx, rules);
		case "MemberExpression":
			return formatMemberExpression(node, ctx, rules);
		case "ArrowFunctionExpression":
			return formatArrowFunction(node, ctx, rules);
		case "ObjectExpression":
			return formatObjectExpression(node, ctx, rules);
		case "ArrayExpression":
			return formatArrayExpression(node, ctx, rules);
		case "Identifier":
			return node.name as string;
		case "Literal":
			return String(node.raw);
		case "UnaryExpression":
			return `${node.operator}${formatNode(node.argument as Node, ctx, rules)}`;
		case "BinaryExpression":
		case "LogicalExpression":
			return `${formatNode(node.left as Node, ctx, rules)} ${node.operator} ${formatNode(node.right as Node, ctx, rules)}`;
		case "ConditionalExpression":
			return `${formatNode(node.test as Node, ctx, rules)} ? ${formatNode(node.consequent as Node, ctx, rules)} : ${formatNode(node.alternate as Node, ctx, rules)}`;
		default:
			return ""; // Fallback
	}
}

function formatCallExpression(node: Node, ctx: FormatContext, rules: FormatRules): string {
	const callee = node.callee as Node;

	// Method chain?
	if (callee.type === "MemberExpression") {
		const chain = collectChain(node);
		return formatChain(chain, ctx, rules);
	}

	// Simple function call
	const name = formatNode(callee, ctx, rules);
	const args = formatArgs(node.arguments as Node[], ctx, rules);
	return `${name}(${args})`;
}

function formatMemberExpression(node: Node, ctx: FormatContext, rules: FormatRules): string {
	// Treat member expressions as chains
	const chain = collectChain(node);
	return formatChain(chain, ctx, rules);
}

function formatArrowFunction(node: Node, ctx: FormatContext, rules: FormatRules): string {
	const params = (node.params as Node[]).map((p) => formatNode(p, ctx, rules)).join(", ");
	const body = formatNode(node.body as Node, ctx, rules);
	return `${params} => ${body}`;
}

function formatObjectExpression(node: Node, ctx: FormatContext, rules: FormatRules): string {
	const props = node.properties as Node[];
	if (props.length === 0) return "{}";

	const formatted = props.map((prop) => {
		const key = (prop.key as Node).name || (prop.key as Node).raw;
		const value = formatNode(prop.value as Node, indent(ctx), rules);
		return `${key}: ${value}`;
	});

	// Try inline
	const oneLine = `{ ${formatted.join(", ")} }`;
	if (props.length <= rules.maxInlineObjectProps && oneLine.length <= rules.maxLineLength) {
		return oneLine;
	}

	// Multi-line with } on last prop line
	const propIndent = indentStr(indent(ctx), rules);
	const lines = formatted.map((p, i) => {
		const isLast = i === formatted.length - 1;
		return `${propIndent}${p}${isLast ? "}" : ","}`;
	});
	return `{\n${lines.join("\n")}`;
}

function formatArrayExpression(node: Node, ctx: FormatContext, rules: FormatRules): string {
	const elements = node.elements as Node[];
	if (elements.length === 0) return "[]";

	const formatted = elements.map((e) => formatNode(e, ctx, rules));
	const oneLine = `[${formatted.join(", ")}]`;

	if (oneLine.length <= rules.maxLineLength) {
		return oneLine;
	}

	const elemIndent = indentStr(indent(ctx), rules);
	return `[\n${formatted.map((e) => `${elemIndent}${e}`).join(",\n")}\n${indentStr(ctx, rules)}]`;
}

// =============================================================================
// Chain Handling
// =============================================================================

function collectChain(node: Node): Chain {
	const parts: ChainPart[] = [];
	let current = node;

	while (true) {
		if (current.type === "CallExpression") {
			const callee = current.callee as Node;
			if (callee.type !== "MemberExpression") break;

			const method = (callee.property as Node).name as string;
			const args = current.arguments as Node[];
			parts.unshift({ method, args });

			current = callee.object as Node;
		} else if (current.type === "MemberExpression") {
			// Property access (no call)
			const prop = (current.property as Node).name as string;
			parts.unshift({ method: prop, args: null });

			current = current.object as Node;
		} else {
			break;
		}
	}

	return { root: current, parts };
}

// =============================================================================
// Device Style Normalization
// =============================================================================

/**
 * Normalize a chain to use preferred device styles.
 * Merges setter methods into device calls, converts between styles.
 */
function normalizeChain(chain: Chain): Chain {
	let newRoot = chain.root;
	let startIndex = 0;

	// Check if root is a device call: saw() or saw(440) or saw({ freq: 440 })
	if (chain.root.type === "CallExpression") {
		const callee = chain.root.callee as Node;
		if (callee.type === "Identifier") {
			const deviceName = callee.name as string;
			const device = getDevice(deviceName);
			if (device) {
				// Root is a device! Collect setters from the start of parts
				const setters: Map<string, Node> = new Map();
				let j = 0;
				while (j < chain.parts.length) {
					const next = chain.parts[j]!;
					if (next.args === null || next.args.length !== 1) break;
					if (!isDeviceParam(deviceName, next.method)) break;
					setters.set(next.method, next.args[0]!);
					j++;
				}

				// Extract existing args from root call
				const allArgs = new Map<string, Node>();
				const rootArgs = chain.root.arguments as Node[];

				if (rootArgs.length === 1 && rootArgs[0]!.type === "ObjectExpression") {
					const obj = rootArgs[0]!;
					for (const prop of (obj.properties as Node[]) || []) {
						const key = ((prop.key as Node).name || (prop.key as Node).value) as string;
						allArgs.set(key, prop.value as Node);
					}
				} else {
					for (let k = 0; k < rootArgs.length && k < device.args.length; k++) {
						allArgs.set(device.args[k]!, rootArgs[k]!);
					}
				}

				// Add setters
				for (const [key, value] of setters) {
					allArgs.set(key, value);
				}

				// Build new root with normalized args
				const normalizedArgs = formatDeviceArgs(deviceName, device, allArgs);
				newRoot = {
					...chain.root,
					arguments: normalizedArgs.args || [],
				} as Node;

				startIndex = j; // Skip consumed setters
			}
		}
	}

	// Process remaining parts
	const newParts: ChainPart[] = [];

	for (let i = startIndex; i < chain.parts.length; i++) {
		const part = chain.parts[i]!;

		// Property access - keep as-is
		if (part.args === null) {
			newParts.push(part);
			continue;
		}

		const device = getDevice(part.method);

		// Not a device - keep as-is
		if (!device) {
			newParts.push(part);
			continue;
		}

		// It's a device call! Collect args from all sources.

		// 1. Collect any setter methods that follow this device
		const setters: Map<string, Node> = new Map();
		let j = i + 1;
		while (j < chain.parts.length) {
			const next = chain.parts[j]!;
			// Setter must be a single-arg method call that's a param of this device
			if (next.args === null || next.args.length !== 1) break;
			if (!isDeviceParam(part.method, next.method)) break;
			setters.set(next.method, next.args[0]!);
			j++;
		}

		// 2. Extract args from the device call itself
		const allArgs = new Map<string, Node>();

		if (part.args.length === 1 && part.args[0]!.type === "ObjectExpression") {
			// Config style: device({ param: value })
			const obj = part.args[0]!;
			for (const prop of (obj.properties as Node[]) || []) {
				const key = ((prop.key as Node).name || (prop.key as Node).value) as string;
				allArgs.set(key, prop.value as Node);
			}
		} else {
			// Positional style: map to param names
			for (let k = 0; k < part.args.length && k < device.args.length; k++) {
				allArgs.set(device.args[k]!, part.args[k]!);
			}
		}

		// 3. Add setter args (they override)
		for (const [key, value] of setters) {
			allArgs.set(key, value);
		}

		// 4. Format according to preferred style
		const normalizedPart = formatDeviceArgs(part.method, device, allArgs);
		newParts.push(normalizedPart);

		// Skip the setter methods we consumed
		i = j - 1;
	}

	return { root: newRoot, parts: newParts };
}

/**
 * Format device args according to preferred style.
 */
function formatDeviceArgs(
	method: string,
	device: DeviceConfig,
	args: Map<string, Node>,
): ChainPart {
	if (args.size === 0) {
		return { method, args: [] };
	}

	switch (device.style) {
		case "positional": {
			// Build positional args array in order
			const positional: Node[] = [];
			for (const name of device.args) {
				const arg = args.get(name);
				if (arg) {
					positional.push(arg);
				} else {
					// Stop at first missing arg
					break;
				}
			}
			return { method, args: positional };
		}

		case "config": {
			// Build object expression
			const properties: Node[] = [];
			for (const name of device.args) {
				const arg = args.get(name);
				if (arg) {
					properties.push({
						type: "Property",
						key: { type: "Identifier", name },
						value: arg,
						kind: "init",
						method: false,
						shorthand: false,
						computed: false,
					} as unknown as Node);
				}
			}
			if (properties.length === 0) {
				return { method, args: [] };
			}
			const obj: Node = {
				type: "ObjectExpression",
				properties,
			} as unknown as Node;
			return { method, args: [obj] };
		}

		case "setters":
			// For setters style, we'd need to return multiple parts
			// For now, fall back to positional
			// TODO: implement setter style output
			return formatDeviceArgs(method, { ...device, style: "positional" }, args);
	}
}

// Check if chain should break to multiline
function shouldChainBreak(chain: Chain, ctx: FormatContext, rules: FormatRules): boolean {
	// Has .apply() → break
	if (chain.parts.some((p) => p.method === "apply")) {
		return true;
	}

	// Has side-chain arg (chain as argument) → break
	if (chain.parts.some((p) => p.args?.some((a) => isChainNode(a)))) {
		return true;
	}

	// Has multiline object → break
	if (chain.parts.some((p) => p.args?.some((a) => isMultilineObject(a, rules)))) {
		return true;
	}

	// Check total length
	const inlineLength = estimateInlineLength(chain, ctx, rules);
	const currentIndent = ctx.depth * rules.indent.length;
	return currentIndent + inlineLength > rules.maxLineLength;
}

function isChainNode(node: Node): boolean {
	return (
		(node.type === "CallExpression" && (node.callee as Node).type === "MemberExpression") ||
		node.type === "MemberExpression"
	);
}

function isMultilineObject(node: Node, rules: FormatRules): boolean {
	if (node.type !== "ObjectExpression") return false;
	const props = (node as any).properties as Node[];
	return props.length > rules.maxInlineObjectProps;
}

function estimateInlineLength(chain: Chain, ctx: FormatContext, rules: FormatRules): number {
	let length = formatNode(chain.root, ctx, rules).length;
	for (const part of chain.parts) {
		if (part.args === null) {
			// Property access: .prop
			length += 1 + part.method.length;
		} else {
			// Method call: .method(args)
			length += 1 + part.method.length + 2;
			const argsStr = part.args.map((a) => formatNode(a, ctx, rules)).join(", ");
			length += argsStr.length;
		}
	}
	return length;
}

function formatChain(rawChain: Chain, ctx: FormatContext, rules: FormatRules): string {
	// Normalize device styles before formatting
	const chain = normalizeChain(rawChain);

	if (!shouldChainBreak(chain, ctx, rules)) {
		// Inline: root.method1(args).prop.method2(args)
		let result = formatNode(chain.root, ctx, rules);
		for (const part of chain.parts) {
			if (part.args === null) {
				result += `.${part.method}`;
			} else {
				const args = formatArgs(part.args, ctx, rules);
				result += `.${part.method}(${args})`;
			}
		}
		return result;
	}

	// Multiline: each part on its own line
	const childIndent = indentStr(indent(ctx), rules);
	let result = formatNode(chain.root, ctx, rules);

	for (const part of chain.parts) {
		if (part.args === null) {
			// Property access
			result += `\n${childIndent}.${part.method}`;
		} else if (part.method === "apply" && part.args.length === 1 && (part.args[0] as Node).type === "ArrowFunctionExpression") {
			result += formatApplyPart(part, ctx, rules);
		} else {
			const args = formatArgs(part.args, indent(ctx), rules);
			result += `\n${childIndent}.${part.method}(${args})`;
		}
	}

	return result;
}

function formatApplyPart(part: ChainPart, ctx: FormatContext, rules: FormatRules): string {
	const arrow = part.args[0] as Node;
	const param = formatNode((arrow.params as Node[])[0]!, ctx, rules);
	const bodyNode = arrow.body as Node;

	const childIndent = indentStr(indent(ctx), rules);
	const bodyIndent = indentStr(indent(indent(ctx)), rules);

	let body: string;
	if (isChainNode(bodyNode)) {
		const innerChain = collectChain(bodyNode);
		// Format the body chain, but keep root + first method together
		body = formatChainWithFirstMethodInline(innerChain, indent(indent(ctx)), rules);
	} else {
		body = formatNode(bodyNode, indent(indent(ctx)), rules);
	}

	return `\n${childIndent}.apply(${param} =>\n${bodyIndent}${body})`;
}

// Format chain with root + first part on same line (for apply bodies)
function formatChainWithFirstMethodInline(chain: Chain, ctx: FormatContext, rules: FormatRules): string {
	if (chain.parts.length === 0) {
		return formatNode(chain.root, ctx, rules);
	}

	// Root + first part together
	const firstPart = chain.parts[0]!;
	let result: string;
	if (firstPart.args === null) {
		result = `${formatNode(chain.root, ctx, rules)}.${firstPart.method}`;
	} else {
		const firstArgs = formatArgs(firstPart.args, indent(ctx), rules);
		result = `${formatNode(chain.root, ctx, rules)}.${firstPart.method}(${firstArgs})`;
	}

	// Remaining parts each on their own line
	const childIndent = indentStr(indent(ctx), rules);
	for (let i = 1; i < chain.parts.length; i++) {
		const part = chain.parts[i]!;
		if (part.args === null) {
			result += `\n${childIndent}.${part.method}`;
		} else if (part.method === "apply" && part.args.length === 1 && (part.args[0] as Node).type === "ArrowFunctionExpression") {
			result += formatApplyPart(part, ctx, rules);
		} else {
			const args = formatArgs(part.args, indent(ctx), rules);
			result += `\n${childIndent}.${part.method}(${args})`;
		}
	}

	return result;
}

// =============================================================================
// Argument Formatting
// =============================================================================

function formatArgs(args: Node[], ctx: FormatContext, rules: FormatRules): string {
	if (args.length === 0) return "";

	const formatted: string[] = [];
	let hasMultilineChain = false;

	for (const arg of args) {
		if (isChainNode(arg)) {
			// Side-chain: format it first to see if it's multiline
			const chain = collectChain(arg);
			const chainStr = formatChain(chain, indent(ctx), rules);
			formatted.push(chainStr);
			// Only break to newline for multiline CHAINS, not objects
			if (chainStr.includes("\n")) {
				hasMultilineChain = true;
			}
		} else {
			// Objects and other args stay inline after (, their contents may break
			formatted.push(formatNode(arg, ctx, rules));
		}
	}

	// Only break args to new lines if there's a multiline chain
	if (hasMultilineChain) {
		const argIndent = indentStr(indent(ctx), rules);
		return `\n${formatted.map((f) => `${argIndent}${f}`).join(",\n")}`;
	}

	return formatted.join(", ");
}
