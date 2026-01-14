/**
 * Dump tokenized output for a sequencer pattern.
 *
 * Usage:
 *   npx tsx src/tools/seq-tokens.ts "c4 e4 g4"
 *   npx tsx src/tools/seq-tokens.ts "[c4 e4]*2" --json
 */

import { tokenize } from "@/core2/devices/seq/tokenize";

// CLI
const args = process.argv.slice(2);
const pattern = args.find((a) => !a.startsWith("--")) || "c4 e4 g4";
const jsonOutput = args.includes("--json");

try {
	const tokens = tokenize(pattern);

	console.log(`Pattern: "${pattern}"`);
	console.log(`Tokens: ${tokens.length}`);
	console.log("");

	if (jsonOutput) {
		console.log(JSON.stringify(tokens, null, 2));
	} else {
		for (const token of tokens) {
			const pos = token.position.toString().padStart(3);
			const type = token.type.padEnd(10);
			const value = token.value || "(empty)";
			console.log(`  [${pos}] ${type} ${value}`);
		}
	}
} catch (err) {
	console.error(`Error: ${err}`);
	process.exit(1);
}
