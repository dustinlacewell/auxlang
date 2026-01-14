/**
 * Visualize euclidean rhythm patterns.
 *
 * Usage:
 *   npx tsx src/tools/seq-euclidean.ts 3 8
 *   npx tsx src/tools/seq-euclidean.ts 5 12 --rotations
 *   npx tsx src/tools/seq-euclidean.ts --common
 */

import { euclidean } from "@/core2/devices/seq/traverse/euclidean";

function formatPattern(pattern: boolean[]): string {
	return pattern.map((hit) => (hit ? "x" : ".")).join(" ");
}

function rotateLeft(pattern: boolean[], amount: number): boolean[] {
	const n = pattern.length;
	const normalized = ((amount % n) + n) % n;
	return [...pattern.slice(normalized), ...pattern.slice(0, normalized)];
}

// CLI
const args = process.argv.slice(2);
const showCommon = args.includes("--common");
const showRotations = args.includes("--rotations");

if (showCommon) {
	// Show common euclidean patterns
	const commonPatterns = [
		[3, 8, "Tresillo (Cuban)"],
		[5, 8, "Cinquillo (Cuban)"],
		[7, 8, "Heavy rock"],
		[2, 5, "Khafif-e-ramal (Persian)"],
		[3, 4, "Cumbia"],
		[5, 6, "York-Samai (Arabic)"],
		[7, 12, "West African bell"],
		[5, 16, "Bossa nova"],
		[9, 16, "Rumba"],
		[4, 7, "Bulgarian ruchenitsa"],
		[5, 9, "Turkish aksak"],
		[7, 16, "Samba"],
	] as const;

	console.log("Common Euclidean Rhythms:");
	console.log("");

	for (const [hits, steps, name] of commonPatterns) {
		const pattern = euclidean(hits, steps);
		console.log(`  (${hits},${steps}) ${formatPattern(pattern)}  ${name}`);
	}
} else {
	const hits = parseInt(args[0] || "3");
	const steps = parseInt(args[1] || "8");

	if (isNaN(hits) || isNaN(steps) || steps <= 0) {
		console.error("Usage: seq-euclidean <hits> <steps>");
		console.error("       seq-euclidean --common");
		process.exit(1);
	}

	const pattern = euclidean(hits, steps);

	console.log(`Euclidean (${hits}, ${steps}):`);
	console.log(`  ${formatPattern(pattern)}`);
	console.log("");

	if (showRotations) {
		console.log("Rotations:");
		for (let r = 0; r < steps; r++) {
			const rotated = rotateLeft(pattern, r);
			const marker = r === 0 ? " <-" : "";
			console.log(`  [${r.toString().padStart(2)}] ${formatPattern(rotated)}${marker}`);
		}
	}
}
