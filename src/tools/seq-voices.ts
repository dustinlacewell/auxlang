/**
 * Show voice decomposition for a sequencer pattern.
 *
 * Usage:
 *   npx tsx src/tools/seq-voices.ts "{c4, e4, g4}"
 *   npx tsx src/tools/seq-voices.ts "c4 {e4, g4} a4" --strategy duplicate
 *   npx tsx src/tools/seq-voices.ts "{c4 d4, e4 f4}" --ast
 */

import { parseExpr } from "@/core2/devices/seq/expr/parse";
import {
	decomposePattern,
	voiceCount,
	type Expr,
	type ProjectionStrategy,
} from "@/core2/devices/seq/expr/types";
import { countBeats } from "@/core2/devices/seq/expr/count-beats";

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
const pattern = args.find((a) => !a.startsWith("--")) || "{c4, e4, g4}";
const strategyArg = args.includes("--strategy")
	? args[args.indexOf("--strategy") + 1]
	: "isolate";
const strategy: ProjectionStrategy =
	strategyArg === "duplicate" ? "duplicate" : "isolate";
const showAst = args.includes("--ast");

try {
	const expr = parseExpr(pattern);
	const monos = decomposePattern(expr, strategy);

	console.log(`Pattern: "${pattern}"`);
	console.log(`Strategy: ${strategy}`);
	console.log(`Total beats: ${countBeats(expr)}`);
	console.log(`Voice count: ${voiceCount(expr, strategy)}`);
	console.log("");

	for (let i = 0; i < monos.length; i++) {
		const mono = monos[i]!;
		console.log(`Voice ${i}:`);
		console.log(`  Pattern: ${formatCompact(mono)}`);
		console.log(`  Beats: ${countBeats(mono)}`);
		if (showAst) {
			console.log(`  AST: ${JSON.stringify(mono)}`);
		}
		console.log("");
	}
} catch (err) {
	console.error(`Error: ${err}`);
	process.exit(1);
}
