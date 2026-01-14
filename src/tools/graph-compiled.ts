/**
 * Dump compiled runtime graph from an aux script (after poly expansion).
 *
 * Usage:
 *   npx tsx src/tools/graph-compiled.ts "saw(440).out()"
 *   npx tsx src/tools/graph-compiled.ts --file path/to/script.js
 *   npx tsx src/tools/graph-compiled.ts "poly([saw(220), saw(330)]).out()" --json
 *   npx tsx src/tools/graph-compiled.ts "seq('{c4,e4}').saw().out()" --connections
 */

import { reset } from "@/core2/eval/reset";
import * as api from "@/core2/api";
import { getBuilder } from "@/core2/graph/graph-builder";
import { expandPoly, type StereoGraph } from "@/core2/graph/expand-poly";
import { compile, type StereoRuntimeGraph } from "@/core2/runtime/compile";
import type { RuntimeNode } from "@/core2/runtime/runtime-node";
import * as fs from "fs";

function formatRuntimeNode(node: RuntimeNode, showConnections: boolean): string {
	const lines: string[] = [];
	lines.push(`${node.id} [${node.device}]`);

	if (showConnections) {
		for (const [key, source] of Object.entries(node.inputSources)) {
			switch (source.type) {
				case "constant":
					lines.push(`  ${key}: ${source.value}`);
					break;
				case "connection":
					lines.push(`  ${key}: ${source.nodeId}.${source.output}`);
					break;
				case "connectionArray":
					const refs = source.connections.map((c) => `${c.nodeId}.${c.output}`);
					lines.push(`  ${key}: [${refs.join(", ")}]`);
					break;
				case "lambda":
					lines.push(`  ${key}: <lambda>`);
					break;
			}
		}

		if (Object.keys(node.config).length > 0) {
			lines.push(`  config: ${JSON.stringify(node.config)}`);
		}
	}

	return lines.join("\n");
}

function runAndCompile(code: string): { stereo: StereoGraph; runtime: StereoRuntimeGraph } {
	reset();
	const fn = new Function(...Object.keys(api), code);
	fn(...Object.values(api));
	const flat = getBuilder().build();
	const stereo = expandPoly(flat);
	const runtime = compile(stereo);
	return { stereo, runtime };
}

// CLI
const args = process.argv.slice(2);
const fileIndex = args.indexOf("--file");
const jsonOutput = args.includes("--json");
const showConnections = args.includes("--connections") || args.includes("-c");
const showStereo = args.includes("--stereo");

let code: string;

if (fileIndex !== -1 && args[fileIndex + 1]) {
	const filePath = args[fileIndex + 1]!;
	code = fs.readFileSync(filePath, "utf-8");
} else {
	code = args.find((a) => !a.startsWith("--") && !args[args.indexOf(a) - 1]?.startsWith("--file"))
		|| "saw(440).out()";
}

try {
	const { stereo, runtime } = runAndCompile(code);

	console.log(`Code: ${code.length > 60 ? code.slice(0, 60) + "..." : code}`);
	console.log(`Nodes: ${runtime.nodes.length}`);
	console.log(`Left outputs: [${stereo.leftOutputIds.join(", ")}]`);
	console.log(`Right outputs: [${stereo.rightOutputIds.join(", ")}]`);
	console.log("");

	if (jsonOutput) {
		console.log(JSON.stringify(runtime, null, 2));
	} else {
		if (showStereo) {
			console.log("=== Stereo Graph (after expansion) ===");
			for (const node of stereo.nodes) {
				console.log(`${node.id} [${node.device}]`);
			}
			console.log("");
		}

		console.log("=== Runtime Graph ===");
		for (const node of runtime.nodes) {
			console.log(formatRuntimeNode(node, showConnections));
			console.log("");
		}
	}
} catch (err) {
	console.error(`Error: ${err}`);
	process.exit(1);
}
