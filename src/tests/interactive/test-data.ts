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

/** Get all unique categories */
export function getCategories(): string[] {
	const categories = new Set<string>();
	for (const test of tests) {
		categories.add(test.category);
	}
	return Array.from(categories).sort();
}

/** Get all unique devices grouped by category */
export function getDevicesByCategory(): Map<string, string[]> {
	const devicesByCategory = new Map<string, Set<string>>();
	for (const test of tests) {
		let devices = devicesByCategory.get(test.category);
		if (!devices) {
			devices = new Set<string>();
			devicesByCategory.set(test.category, devices);
		}
		devices.add(test.device);
	}
	// Convert sets to sorted arrays
	const result = new Map<string, string[]>();
	for (const [category, devices] of devicesByCategory) {
		result.set(category, Array.from(devices).sort());
	}
	return result;
}

/** Get tests grouped by category then device */
export function getTestsByCategoryAndDevice(): Map<string, Map<string, TestDefinition[]>> {
	const result = new Map<string, Map<string, TestDefinition[]>>();
	for (const test of tests) {
		let categoryMap = result.get(test.category);
		if (!categoryMap) {
			categoryMap = new Map<string, TestDefinition[]>();
			result.set(test.category, categoryMap);
		}
		let deviceTests = categoryMap.get(test.device);
		if (!deviceTests) {
			deviceTests = [];
			categoryMap.set(test.device, deviceTests);
		}
		deviceTests.push(test);
	}
	return result;
}
