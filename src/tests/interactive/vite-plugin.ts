/**
 * Vite plugin for importing interactive test case files.
 *
 * Usage in vite.config.ts:
 *   import { interactiveTestsPlugin } from "./src/tests/interactive/vite-plugin";
 *   plugins: [interactiveTestsPlugin()]
 *
 * Then import in code:
 *   import tests from "virtual:interactive-tests";
 */

import type { Plugin } from "vite";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { categoryToDisplayName, parseTestCase } from "./parser";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CASES_DIR = join(__dirname, "cases");

const VIRTUAL_MODULE_ID = "virtual:interactive-tests";
const RESOLVED_VIRTUAL_MODULE_ID = "\0" + VIRTUAL_MODULE_ID;

interface TestDefinition {
	id: string;
	category: string;
	device: string;
	name: string;
	desc: string;
	code: string;
	filePath: string;
}

/**
 * Recursively find all .js files in a directory.
 */
function findJsFiles(dir: string, files: string[] = []): string[] {
	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);
		if (stat.isDirectory()) {
			findJsFiles(fullPath, files);
		} else if (entry.endsWith(".js")) {
			files.push(fullPath);
		}
	}
	return files;
}

/**
 * Load all test cases from the cases directory.
 */
function loadAllTests(): TestDefinition[] {
	const tests: TestDefinition[] = [];
	const jsFiles = findJsFiles(CASES_DIR);

	for (const file of jsFiles) {
		const relativePath = relative(CASES_DIR, file).replace(/\\/g, "/");
		const parts = relativePath.split("/");

		if (parts.length !== 3) continue;

		const [category, device, filename] = parts;
		const id = filename!.replace(/\.js$/, "");

		const content = readFileSync(file, "utf-8");
		const parsed = parseTestCase(content);

		tests.push({
			id,
			category: categoryToDisplayName(category!),
			device: device!,
			name: parsed.name,
			desc: parsed.desc,
			code: parsed.code,
			filePath: relativePath,
		});
	}

	return tests;
}

export function interactiveTestsPlugin(): Plugin {
	return {
		name: "interactive-tests",

		resolveId(id) {
			if (id === VIRTUAL_MODULE_ID) {
				return RESOLVED_VIRTUAL_MODULE_ID;
			}
		},

		load(id) {
			if (id === RESOLVED_VIRTUAL_MODULE_ID) {
				const tests = loadAllTests();
				return `export default ${JSON.stringify(tests, null, 2)};`;
			}
		},

		handleHotUpdate({ file, server }) {
			// If a test file changes, invalidate the virtual module
			if (file.includes("cases") && file.endsWith(".js")) {
				const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODULE_ID);
				if (mod) {
					server.moduleGraph.invalidateModule(mod);
					return [mod];
				}
			}
		},
	};
}
