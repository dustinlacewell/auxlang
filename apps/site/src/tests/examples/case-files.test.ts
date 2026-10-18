/**
 * Every example/case .js file under src/tests/patterns/cases and
 * src/tests/interactive/cases (the raw patch sources backing the pattern- and
 * interactive-test UIs) must compile through the real eval path, same as
 * the site/module-docs examples. Nothing else runs these files today.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { evalPatch } from "auxlang/eval-patch";
import { parseTestCase } from "../interactive/parser";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const CASE_ROOTS = [
	join(__dirname, "../patterns/cases"),
	join(__dirname, "../interactive/cases"),
];

/** Known-broken case files (fail today against the current API; not fixed here). */
const SKIP: Record<string, string> = {};

function findJsFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		const stat = statSync(full);
		if (stat.isDirectory()) {
			out.push(...findJsFiles(full));
		} else if (entry.endsWith(".js")) {
			out.push(full);
		}
	}
	return out;
}

describe("case files compile", () => {
	for (const root of CASE_ROOTS) {
		const files = findJsFiles(root);
		for (const file of files) {
			const label = relative(join(__dirname, ".."), file).replace(/\\/g, "/");
			const reason = SKIP[label];
			const runner = reason ? it.skip : it;
			runner(`${label}${reason ? ` (skipped: ${reason})` : ""}`, () => {
				const content = readFileSync(file, "utf-8");
				const { code } = parseTestCase(content);
				expect(() => evalPatch(code)).not.toThrow();
			});
		}
	}
});
