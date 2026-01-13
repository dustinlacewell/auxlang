#!/usr/bin/env node
/**
 * Format all interactive test files using auxfmt.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { format } from "./format.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TESTS_DIR = join(__dirname, "../../src/tests/interactive/cases");

function walkDir(dir: string): string[] {
	const files: string[] = [];
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) {
			files.push(...walkDir(path));
		} else if (entry.endsWith(".js")) {
			files.push(path);
		}
	}
	return files;
}

function formatTestFile(path: string): boolean {
	const content = readFileSync(path, "utf-8");
	const lines = content.split("\n");

	// First two lines are // name and // desc
	if (lines.length < 3 || !lines[0]?.startsWith("//") || !lines[1]?.startsWith("//")) {
		console.log(`  Skipping ${path} - not a test file`);
		return false;
	}

	const name = lines[0];
	const desc = lines[1];
	const code = lines.slice(2).join("\n").trim();

	if (!code) {
		console.log(`  Skipping ${path} - no code`);
		return false;
	}

	const formatted = format(code);
	const newContent = `${name}\n${desc}\n${formatted}\n`;

	if (newContent !== content) {
		writeFileSync(path, newContent);
		return true;
	}
	return false;
}

function main() {
	const files = walkDir(TESTS_DIR);
	console.log(`Found ${files.length} test files`);

	let changed = 0;
	let errors = 0;

	for (const file of files) {
		try {
			if (formatTestFile(file)) {
				console.log(`  Formatted: ${file}`);
				changed++;
			}
		} catch (e) {
			console.error(`  Error formatting ${file}: ${e}`);
			errors++;
		}
	}

	console.log(`\nDone: ${changed} files changed, ${errors} errors`);
}

main();
