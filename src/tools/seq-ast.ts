/**
 * Dump parsed AST for a sequencer pattern.
 *
 * Usage:
 *   npx tsx src/tools/seq-ast.ts "c4 e4 g4"
 *   npx tsx src/tools/seq-ast.ts "{c4, e4}" --json
 *   npx tsx src/tools/seq-ast.ts "[c4 e4]*2" --compact
 */

import { parseExpr } from "@/core2/devices/seq/ast/parse";
import type { Expr } from "@/core2/devices/seq/ast/types";

function formatTree(expr: Expr, indent = 0): string {
	const pad = "  ".repeat(indent);
	const lines: string[] = [];

	switch (expr.type) {
		case "note":
			lines.push(`${pad}note: ${expr.pitch}`);
			break;

		case "rest":
			lines.push(`${pad}rest`);
			break;

		case "seq":
			lines.push(`${pad}seq:`);
			for (const child of expr.children) {
				lines.push(formatTree(child, indent + 1));
			}
			break;

		case "group":
			lines.push(`${pad}group:`);
			for (const child of expr.children) {
				lines.push(formatTree(child, indent + 1));
			}
			break;

		case "alt":
			lines.push(`${pad}alt:`);
			for (const child of expr.children) {
				lines.push(formatTree(child, indent + 1));
			}
			break;

		case "stack":
			lines.push(`${pad}stack:`);
			for (const child of expr.children) {
				lines.push(formatTree(child, indent + 1));
			}
			break;

		case "tie":
			lines.push(`${pad}tie:`);
			for (const child of expr.children) {
				lines.push(formatTree(child, indent + 1));
			}
			break;

		case "multiply":
			lines.push(`${pad}multiply *${expr.count}:`);
			lines.push(formatTree(expr.child, indent + 1));
			break;

		case "replicate":
			lines.push(`${pad}replicate !${expr.count}:`);
			lines.push(formatTree(expr.child, indent + 1));
			break;

		case "elongate":
			lines.push(`${pad}elongate @${expr.count}:`);
			lines.push(formatTree(expr.child, indent + 1));
			break;

		case "euclidean":
			lines.push(`${pad}euclidean (${expr.hits},${expr.steps}):`);
			lines.push(formatTree(expr.child, indent + 1));
			break;

		case "maybe":
			lines.push(`${pad}maybe ?${expr.prob}:`);
			lines.push(formatTree(expr.child, indent + 1));
			break;
	}

	return lines.join("\n");
}

function formatCompact(expr: Expr): string {
	switch (expr.type) {
		case "note":
			return expr.pitch;
		case "rest":
			return "~";
		case "seq":
			return expr.children.map(formatCompact).join(" ");
		case "group":
			return `[${expr.children.map(formatCompact).join(" ")}]`;
		case "alt":
			return `<${expr.children.map(formatCompact).join(" ")}>`;
		case "stack":
			return `{${expr.children.map(formatCompact).join(", ")}}`;
		case "tie":
			return expr.children.map(formatCompact).join("_");
		case "multiply":
			return `${formatCompact(expr.child)}*${expr.count}`;
		case "replicate":
			return `${formatCompact(expr.child)}!${expr.count}`;
		case "elongate":
			return `${formatCompact(expr.child)}@${expr.count}`;
		case "euclidean":
			return `${formatCompact(expr.child)}(${expr.hits},${expr.steps})`;
		case "maybe":
			return `${formatCompact(expr.child)}?${expr.prob}`;
	}
}

// CLI
const args = process.argv.slice(2);
const pattern = args.find((a) => !a.startsWith("--")) || "c4 e4 g4";
const json = args.includes("--json");
const compact = args.includes("--compact");

try {
	const ast = parseExpr(pattern);

	console.log(`Pattern: "${pattern}"\n`);

	if (json) {
		console.log(JSON.stringify(ast, null, 2));
	} else if (compact) {
		console.log(`Compact: ${formatCompact(ast)}`);
	} else {
		console.log(formatTree(ast));
	}
} catch (err) {
	console.error(`Parse error: ${err}`);
	process.exit(1);
}
