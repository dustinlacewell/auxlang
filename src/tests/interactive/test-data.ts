/**
 * Interactive test data aggregator.
 *
 * Imports test cases from the virtual:interactive-tests module,
 * which reads .js files from the cases/ directory.
 */

import rawTests from "virtual:interactive-tests";

export interface TestDefinition {
	id: string;
	category: string;
	device: string;
	name: string;
	desc: string;
	code: string;
	filePath: string;
}

export const tests: TestDefinition[] = rawTests;

export function getTestsByCategory(): Map<string, TestDefinition[]> {
	const byCategory = new Map<string, TestDefinition[]>();
	for (const test of tests) {
		const existing = byCategory.get(test.category);
		if (existing) {
			existing.push(test);
		} else {
			byCategory.set(test.category, [test]);
		}
	}
	return byCategory;
}
