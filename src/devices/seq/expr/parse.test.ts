import { describe, expect, it } from "vitest";
import { parseExpr } from "./parse";
import { voiceCount } from "./types";
import type { Expr } from "./types";

describe("parseExpr", () => {
	describe("atoms", () => {
		it("parses a single note", () => {
			const result = parseExpr("c4");
			expect(result).toEqual({ type: "note", pitch: "c4" });
		});

		it("parses note with accidental", () => {
			expect(parseExpr("f#3")).toEqual({ type: "note", pitch: "f#3" });
			expect(parseExpr("Bb4")).toEqual({ type: "note", pitch: "bb4" });
		});

		it("parses rest", () => {
			expect(parseExpr("~")).toEqual({ type: "rest" });
		});
	});

	describe("sequences", () => {
		it("parses sequence of notes", () => {
			const result = parseExpr("c4 e4 g4");
			expect(result).toEqual({
				type: "seq",
				children: [
					{ type: "note", pitch: "c4" },
					{ type: "note", pitch: "e4" },
					{ type: "note", pitch: "g4" },
				],
			});
		});

		it("parses sequence with rests", () => {
			const result = parseExpr("c4 ~ e4");
			expect(result).toEqual({
				type: "seq",
				children: [{ type: "note", pitch: "c4" }, { type: "rest" }, { type: "note", pitch: "e4" }],
			});
		});
	});

	describe("group [...]", () => {
		it("parses group", () => {
			const result = parseExpr("[c4 e4]");
			expect(result).toEqual({
				type: "group",
				children: [
					{ type: "note", pitch: "c4" },
					{ type: "note", pitch: "e4" },
				],
			});
		});

		it("parses nested groups", () => {
			const result = parseExpr("[[c4 e4] g4]");
			expect(result).toEqual({
				type: "group",
				children: [
					{
						type: "group",
						children: [
							{ type: "note", pitch: "c4" },
							{ type: "note", pitch: "e4" },
						],
					},
					{ type: "note", pitch: "g4" },
				],
			});
		});
	});

	describe("alternation <...>", () => {
		it("parses alternation", () => {
			const result = parseExpr("<c4 e4>");
			expect(result).toEqual({
				type: "alt",
				children: [
					{ type: "note", pitch: "c4" },
					{ type: "note", pitch: "e4" },
				],
			});
		});

		it("parses nested alternation", () => {
			const result = parseExpr("<<c4 e4> g4>");
			expect(result).toEqual({
				type: "alt",
				children: [
					{
						type: "alt",
						children: [
							{ type: "note", pitch: "c4" },
							{ type: "note", pitch: "e4" },
						],
					},
					{ type: "note", pitch: "g4" },
				],
			});
		});
	});

	describe("stack {...}", () => {
		it("parses stack (chord)", () => {
			const result = parseExpr("{c4,e4,g4}");
			expect(result).toEqual({
				type: "stack",
				children: [
					{ type: "note", pitch: "c4" },
					{ type: "note", pitch: "e4" },
					{ type: "note", pitch: "g4" },
				],
			});
		});

		it("parses stack with sequences", () => {
			const result = parseExpr("{c4 d4, e4}");
			expect(result).toEqual({
				type: "stack",
				children: [
					{
						type: "seq",
						children: [
							{ type: "note", pitch: "c4" },
							{ type: "note", pitch: "d4" },
						],
					},
					{ type: "note", pitch: "e4" },
				],
			});
		});

		it("parses nested stacks", () => {
			const result = parseExpr("{c4, {a4, b4}, g4}");
			expect(result).toEqual({
				type: "stack",
				children: [
					{ type: "note", pitch: "c4" },
					{
						type: "stack",
						children: [
							{ type: "note", pitch: "a4" },
							{ type: "note", pitch: "b4" },
						],
					},
					{ type: "note", pitch: "g4" },
				],
			});
		});
	});

	describe("tie _", () => {
		it("parses simple tie", () => {
			const result = parseExpr("c4_e4");
			expect(result).toEqual({
				type: "tie",
				children: [
					{ type: "note", pitch: "c4" },
					{ type: "note", pitch: "e4" },
				],
			});
		});

		it("parses chained tie", () => {
			const result = parseExpr("c4_e4_g4");
			expect(result).toEqual({
				type: "tie",
				children: [
					{ type: "note", pitch: "c4" },
					{ type: "note", pitch: "e4" },
					{ type: "note", pitch: "g4" },
				],
			});
		});

		it("tie in sequence", () => {
			const result = parseExpr("c4_e4 g4");
			expect(result).toEqual({
				type: "seq",
				children: [
					{
						type: "tie",
						children: [
							{ type: "note", pitch: "c4" },
							{ type: "note", pitch: "e4" },
						],
					},
					{ type: "note", pitch: "g4" },
				],
			});
		});
	});

	describe("modifiers", () => {
		it("parses multiply *n", () => {
			const result = parseExpr("c4*3");
			expect(result).toEqual({
				type: "multiply",
				child: { type: "note", pitch: "c4" },
				count: 3,
			});
		});

		it("parses replicate !n", () => {
			const result = parseExpr("c4!3");
			expect(result).toEqual({
				type: "replicate",
				child: { type: "note", pitch: "c4" },
				count: 3,
			});
		});

		it("parses elongate @n", () => {
			const result = parseExpr("c4@2");
			expect(result).toEqual({
				type: "elongate",
				child: { type: "note", pitch: "c4" },
				count: 2,
			});
		});

		it("parses euclidean (k,n)", () => {
			const result = parseExpr("c4(3,8)");
			expect(result).toEqual({
				type: "euclidean",
				child: { type: "note", pitch: "c4" },
				hits: 3,
				steps: 8,
			});
		});

		it("parses maybe ? (default 0.5)", () => {
			const result = parseExpr("c4?");
			expect(result).toEqual({
				type: "maybe",
				child: { type: "note", pitch: "c4" },
				prob: 0.5,
			});
		});

		it("parses maybe with probability ?0.3", () => {
			const result = parseExpr("c4?0.3");
			expect(result).toEqual({
				type: "maybe",
				child: { type: "note", pitch: "c4" },
				prob: 0.3,
			});
		});

		it("chains maybe probabilities", () => {
			const result = parseExpr("c4?0.5?0.5");
			expect(result).toEqual({
				type: "maybe",
				child: { type: "note", pitch: "c4" },
				prob: 0.25, // 0.5 * 0.5
			});
		});

		it("rejects nested euclidean", () => {
			expect(() => parseExpr("c4(3,8)(2,5)")).toThrow(
				"Nested euclidean patterns are not supported",
			);
		});
	});

	describe("modifier order (left-to-right)", () => {
		it("multiply then elongate", () => {
			const result = parseExpr("c4*2@3");
			expect(result).toEqual({
				type: "elongate",
				child: {
					type: "multiply",
					child: { type: "note", pitch: "c4" },
					count: 2,
				},
				count: 3,
			});
		});

		it("replicate then multiply", () => {
			const result = parseExpr("c4!2*3");
			expect(result).toEqual({
				type: "multiply",
				child: {
					type: "replicate",
					child: { type: "note", pitch: "c4" },
					count: 2,
				},
				count: 3,
			});
		});
	});

	describe("complex patterns", () => {
		it("group with modifiers", () => {
			const result = parseExpr("[c4 e4]*2");
			expect(result).toEqual({
				type: "multiply",
				child: {
					type: "group",
					children: [
						{ type: "note", pitch: "c4" },
						{ type: "note", pitch: "e4" },
					],
				},
				count: 2,
			});
		});

		it("stack with probability", () => {
			const result = parseExpr("{c4,e4}?");
			expect(result).toEqual({
				type: "maybe",
				child: {
					type: "stack",
					children: [
						{ type: "note", pitch: "c4" },
						{ type: "note", pitch: "e4" },
					],
				},
				prob: 0.5,
			});
		});

		it("alternation in stack", () => {
			const result = parseExpr("{<c4 e4>, g4}");
			expect(result).toEqual({
				type: "stack",
				children: [
					{
						type: "alt",
						children: [
							{ type: "note", pitch: "c4" },
							{ type: "note", pitch: "e4" },
						],
					},
					{ type: "note", pitch: "g4" },
				],
			});
		});

		it("tie between stacks", () => {
			const result = parseExpr("{c4,e4}_{g4,a4}");
			expect(result).toEqual({
				type: "tie",
				children: [
					{
						type: "stack",
						children: [
							{ type: "note", pitch: "c4" },
							{ type: "note", pitch: "e4" },
						],
					},
					{
						type: "stack",
						children: [
							{ type: "note", pitch: "g4" },
							{ type: "note", pitch: "a4" },
						],
					},
				],
			});
		});
	});
});

describe("voiceCount", () => {
	it("note = 1 voice", () => {
		expect(voiceCount({ type: "note", pitch: "c4" })).toBe(1);
	});

	it("rest = 1 voice", () => {
		expect(voiceCount({ type: "rest" })).toBe(1);
	});

	it("sequence = 1 voice", () => {
		const expr = parseExpr("c4 e4 g4");
		expect(voiceCount(expr)).toBe(1);
	});

	it("simple stack = n voices", () => {
		const expr = parseExpr("{c4,e4,g4}");
		expect(voiceCount(expr)).toBe(3);
	});

	it("nested stack flattens", () => {
		const expr = parseExpr("{c4, {a4, b4}, g4}");
		expect(voiceCount(expr)).toBe(4);
	});

	it("stack with sequences = branch count", () => {
		const expr = parseExpr("{c4 d4, e4}");
		expect(voiceCount(expr)).toBe(2);
	});

	it("deeply nested stacks flatten", () => {
		const expr = parseExpr("{a, {b, {c, d}}}");
		expect(voiceCount(expr)).toBe(4);
	});

	it("modifier doesn't change voice count", () => {
		const expr = parseExpr("{c4,e4}*2");
		expect(voiceCount(expr)).toBe(2);
	});

	it("tie preserves voice count", () => {
		const expr = parseExpr("{c4,e4}_{g4,a4}");
		expect(voiceCount(expr)).toBe(2); // First child determines count
	});
});
