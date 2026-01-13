/**
 * Validates all interactive test cases compile with core2.
 */

import { describe, expect, it } from "vitest";
import * as api from "@/core2/api";
import { reset } from "@/core2/eval/reset";
import { runCode } from "@/core2/eval/run-code";
import { collect } from "@/core2/eval/collect";
import { expandPoly } from "@/core2/graph/expand-poly";
import { compile } from "@/core2/runtime/compile";
import { tests } from "@/tests/interactive/test-data";

interface ValidationResult {
	id: string;
	name: string;
	category: string;
	success: boolean;
	error?: string;
	nodeCount?: number;
}

function validateTest(test: { id: string; name: string; category: string; code: string }): ValidationResult {
	reset();

	try {
		runCode(test.code, api);
		const graph = collect();

		if (graph.nodes.length === 0) {
			return {
				id: test.id,
				name: test.name,
				category: test.category,
				success: false,
				error: "No nodes in graph (missing out() call?)",
			};
		}

		const expanded = expandPoly(graph);
		const stereo = compile(expanded);

		return {
			id: test.id,
			name: test.name,
			category: test.category,
			success: true,
			nodeCount: stereo.nodes.length,
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

describe("interactive tests compile with core2", () => {
	const results = tests.map(validateTest);
	const byCategory = new Map<string, ValidationResult[]>();

	for (const result of results) {
		const list = byCategory.get(result.category) ?? [];
		list.push(result);
		byCategory.set(result.category, list);
	}

	for (const [category, categoryResults] of byCategory) {
		describe(category, () => {
			for (const result of categoryResults) {
				it(result.name, () => {
					if (!result.success) {
						throw new Error(result.error);
					}
					expect(result.nodeCount).toBeGreaterThan(0);
				});
			}
		});
	}
});
