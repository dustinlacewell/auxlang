/**
 * Pattern test data aggregator.
 * Imports test cases from the virtual:pattern-tests module.
 */

import rawTests from "virtual:pattern-tests";
import type { PatternExample } from "@/ui/test-suite/shared/types";

export type { PatternExample };

export const tests: PatternExample[] = rawTests;

/** Get all unique categories */
export function getCategories(): string[] {
	const categories = new Set<string>();
	for (const test of tests) {
		categories.add(test.category);
	}
	return Array.from(categories).sort();
}

/** Get tests grouped by category */
export function getTestsByCategory(): Map<string, PatternExample[]> {
	const result = new Map<string, PatternExample[]>();
	for (const test of tests) {
		let categoryTests = result.get(test.category);
		if (!categoryTests) {
			categoryTests = [];
			result.set(test.category, categoryTests);
		}
		categoryTests.push(test);
	}
	return result;
}
