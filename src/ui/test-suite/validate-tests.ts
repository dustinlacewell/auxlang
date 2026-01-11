/**
 * Validates all test cases by attempting to compile and evaluate them.
 * Run with: npx tsx src/ui/test-suite/validate-tests.ts
 */

import { resetIdCounter } from "@/descriptor/identity";
import { clearRegistry } from "@/descriptor/registry";
import * as api from "@/editor/api";
import { clearOutputs, collectStereoGraph } from "@/graph/out";
import { tests } from "./test-data";

interface ValidationResult {
	id: string;
	name: string;
	category: string;
	success: boolean;
	error?: string;
	nodeCount?: number;
}

function validateTest(test: { id: string; name: string; category: string; code: string }): ValidationResult {
	// Reset state before each test
	resetIdCounter();
	clearRegistry();
	clearOutputs();

	try {
		// Evaluate code
		const fn = new Function(...Object.keys(api), test.code);
		fn(...Object.values(api));

		// Collect stereo graph
		const stereo = collectStereoGraph();
		if (!stereo) {
			return {
				id: test.id,
				name: test.name,
				category: test.category,
				success: false,
				error: "No out() calls in code",
			};
		}

		return {
			id: test.id,
			name: test.name,
			category: test.category,
			success: true,
			nodeCount: stereo.left.nodes.length,
		};
	} catch (err) {
		return {
			id: test.id,
			name: test.name,
			category: test.category,
			success: false,
			error: String(err),
		};
	}
}

function main() {
	console.log("Validating all test cases...\n");

	const results = tests.map(validateTest);
	const failures = results.filter((r) => !r.success);
	const successes = results.filter((r) => r.success);

	// Print successes summary
	console.log(`✓ ${successes.length} tests passed\n`);

	// Print failures in detail
	if (failures.length > 0) {
		console.log(`✗ ${failures.length} tests failed:\n`);
		for (const failure of failures) {
			console.log(`  [${failure.category}] ${failure.name} (${failure.id})`);
			console.log(`    Error: ${failure.error}\n`);
		}
	}

	// Summary by category
	console.log("By category:");
	const byCategory = new Map<string, { pass: number; fail: number }>();
	for (const result of results) {
		const cat = byCategory.get(result.category) ?? { pass: 0, fail: 0 };
		if (result.success) cat.pass++;
		else cat.fail++;
		byCategory.set(result.category, cat);
	}
	for (const [category, counts] of byCategory) {
		const status = counts.fail === 0 ? "✓" : "✗";
		console.log(`  ${status} ${category}: ${counts.pass}/${counts.pass + counts.fail}`);
	}

	// Exit with error code if any failures
	process.exit(failures.length > 0 ? 1 : 0);
}

main();
