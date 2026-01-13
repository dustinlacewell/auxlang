#!/usr/bin/env node
/**
 * CLI for auxfmt formatter.
 *
 * Usage:
 *   auxfmt <file>           Format file in place
 *   auxfmt --check <file>   Check if file is formatted
 *   auxfmt --stdin          Read from stdin, write to stdout
 */

import { readFileSync, writeFileSync } from "node:fs";
import { format } from "./format.js";

const args = process.argv.slice(2);

if (args.length === 0) {
	console.log("Usage: auxfmt [--check] [--stdin] <file>");
	process.exit(1);
}

const checkMode = args.includes("--check");
const stdinMode = args.includes("--stdin");
const files = args.filter((a) => !a.startsWith("--"));

if (stdinMode) {
	// Read from stdin
	let input = "";
	process.stdin.setEncoding("utf8");
	process.stdin.on("data", (chunk) => {
		input += chunk;
	});
	process.stdin.on("end", () => {
		const result = format(input);
		process.stdout.write(result);
	});
} else if (files.length > 0) {
	let exitCode = 0;

	for (const file of files) {
		const content = readFileSync(file, "utf-8");

		// Extract header comments (// name, // desc)
		const lines = content.split("\n");
		const headerLines: string[] = [];
		let codeStart = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i]!.trim();
			if (line.startsWith("//")) {
				headerLines.push(lines[i]!);
				codeStart = i + 1;
			} else if (line === "") {
				continue;
			} else {
				break;
			}
		}

		const code = lines.slice(codeStart).join("\n").trim();
		const formatted = format(code);
		const result = [...headerLines, formatted].join("\n") + "\n";

		if (checkMode) {
			if (result !== content) {
				console.log(`${file}: not formatted`);
				exitCode = 1;
			}
		} else {
			if (result !== content) {
				writeFileSync(file, result, "utf-8");
				console.log(`Formatted: ${file}`);
			}
		}
	}

	process.exit(exitCode);
} else {
	console.log("No files specified");
	process.exit(1);
}
