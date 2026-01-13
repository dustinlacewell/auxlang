#!/usr/bin/env node
/**
 * Test runner for auxfmt.
 * Runs all .test.ts files in tests/ directory.
 */

import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface TestResult {
	name: string;
	passed: boolean;
	expected?: string;
	actual?: string;
}

const results: TestResult[] = [];

export function test(name: string, input: string, expected: string) {
	// Lazy import to avoid circular
	const { format } = require("../src/format.js");
	const actual = format(input);
	const passed = actual === expected;
	results.push({ name, passed, expected, actual });
}

async function main() {
	const testFiles = readdirSync(__dirname).filter((f) => f.endsWith(".test.ts") && f !== "run.ts");

	for (const file of testFiles) {
		await import(join(__dirname, file));
	}

	let passed = 0;
	let failed = 0;

	for (const r of results) {
		if (r.passed) {
			console.log(`✓ ${r.name}`);
			passed++;
		} else {
			console.log(`✗ ${r.name}`);
			console.log("  Expected:");
			console.log(r.expected!.split("\n").map((l) => `    ${l}`).join("\n"));
			console.log("  Got:");
			console.log(r.actual!.split("\n").map((l) => `    ${l}`).join("\n"));
			failed++;
		}
	}

	console.log(`\n${passed} passed, ${failed} failed`);
	process.exit(failed > 0 ? 1 : 0);
}

main();
