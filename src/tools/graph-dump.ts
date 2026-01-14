/**
 * Dump flat graph from an aux script (before poly expansion).
 *
 * Usage:
 *   npx tsx src/tools/graph-dump.ts "saw(440).out()"
 *   npx tsx src/tools/graph-dump.ts --file path/to/script.js
 *   npx tsx src/tools/graph-dump.ts "seq('c4').saw().out()" --json
 *   npx tsx src/tools/graph-dump.ts "clock(120).seq('c4').saw().out()" --connections
 */

import { reset } from "@/core2/eval/reset";
import * as api from "@/core2/api";
import { getBuilder } from "@/core2/graph/graph-builder";
import type { Node } from "@/core2/graph/node";
import * as fs from "fs";

function formatNode(node: Node, showConnections: boolean): string {
	const lines: string[] = [];
	lines.push(`${node.id} [${node.device}]`);

	if (showConnections) {
		for (const [key, value] of Object.entries(node.inputs)) {
			if (value === undefined || value === null) continue;

			if (typeof value === "number") {
				lines.push(`  ${key}: ${value}`);
			} else if (typeof value === "object" && "ref" in value && "out" in value) {
				const ref = value as { ref: string; out: string };
				lines.push(`  ${key}: ${ref.ref}.${ref.out}`);
			} else if (typeof value === "function") {
				lines.push(`  ${key}: <lambda>`);
			} else if (Array.isArray(value)) {
				const refs = value.map((v: unknown) => {
					if (typeof v === "object" && v && "ref" in v && "out" in v) {
						const r = v as { ref: string; out: string };
						return `${r.ref}.${r.out}`;
					}
					return String(v);
				});
				lines.push(`  ${key}: [${refs.join(", ")}]`);
			} else {
				lines.push(`  ${key}: ${JSON.stringify(value)}`);
			}
		}

		if (Object.keys(node.config).length > 0) {
			lines.push(`  config: ${JSON.stringify(node.config)}`);
		}
	}

	return lines.join("\n");
}

function runScript(code: string): Node[] {
	reset();
	const fn = new Function(...Object.keys(api), code);
	fn(...Object.values(api));
	return getBuilder().getNodes();
}

// CLI
const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const jsonOutput = args.includes("--json");
const showConnections = args.includes("--connections") || args.includes("-c");

let code: string;

if (fileIndex !== -1 && args[fileIndex + 1]) {
	const filePath = args[fileIndex + 1]!;
	code = fs.readFileSync(filePath, "utf-8");
} else {
	code = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--file"))
		|| "saw(440).out()";
}

try {
	const nodes = runScript(code);

	console.log(`Code: ${code.length > 60 ? code.slice(0, 60) + "..." : code}`);
	console.log(`Nodes: ${nodes.length}`);
	console.log("");

	if (jsonOutput) {
		console.log(JSON.stringify(nodes, null, 2));
	} else {
		for (const node of nodes) {
			console.log(formatNode(node, showConnections));
			console.log("");
		}
	}
} catch (err) {
	console.error(`Error: ${err}`);
	process.exit(1);
}
