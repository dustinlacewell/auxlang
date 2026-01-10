import { describe, expect, it } from "vitest";
import { parseExpr } from "./parse";
import { decomposePattern, projectVoice, voiceCount } from "./types";

/** Helper to get a readable string representation of an expr */
function exprToString(expr: any): string {
	switch (expr.type) {
		case "note":
			return expr.pitch;
		case "rest":
			return "~";
		case "seq":
			return expr.children.map(exprToString).join(" ");
		case "group":
			return `[${expr.children.map(exprToString).join(" ")}]`;
		case "alt":
			return `<${expr.children.map(exprToString).join(" ")}>`;
		case "stack":
			return `{${expr.children.map(exprToString).join(", ")}}`;
		case "tie":
			return expr.children.map(exprToString).join("_");
		case "multiply":
			return `${exprToString(expr.child)}*${expr.count}`;
		case "replicate":
			return `${exprToString(expr.child)}!${expr.count}`;
		case "elongate":
			return `${exprToString(expr.child)}@${expr.count}`;
		case "euclidean":
			return `${exprToString(expr.child)}(${expr.hits},${expr.steps})`;
		case "maybe":
			return `${exprToString(expr.child)}?${expr.prob}`;
		default:
			return JSON.stringify(expr);
	}
}

describe("projectVoice", () => {
	it("projects simple stack", () => {
		const expr = parseExpr("{c4, e4, g4}");
		expect(voiceCount(expr)).toBe(3);

		expect(exprToString(projectVoice(expr, 0))).toBe("c4");
		expect(exprToString(projectVoice(expr, 1))).toBe("e4");
		expect(exprToString(projectVoice(expr, 2))).toBe("g4");
	});

	it("projects stack in sequence", () => {
		// {a, b} x {c, d} -> Voice 0: a x c, Voice 1: b x d
		const expr = parseExpr("{c4, e4} g4 {a4, b4}");
		expect(voiceCount(expr)).toBe(2);

		expect(exprToString(projectVoice(expr, 0))).toBe("c4 g4 a4");
		expect(exprToString(projectVoice(expr, 1))).toBe("e4 g4 b4");
	});

	it("projects nested stacks (flattening)", () => {
		// {a, {b, c}} -> 3 voices
		const expr = parseExpr("{c4, {e4, g4}}");
		expect(voiceCount(expr)).toBe(3);

		expect(exprToString(projectVoice(expr, 0))).toBe("c4");
		expect(exprToString(projectVoice(expr, 1))).toBe("e4");
		expect(exprToString(projectVoice(expr, 2))).toBe("g4");
	});

	it("projects modifiers on stacks", () => {
		// {a, b}*2 -> Voice 0: a*2, Voice 1: b*2
		const expr = parseExpr("{c4, e4}*2");
		expect(voiceCount(expr)).toBe(2);

		expect(exprToString(projectVoice(expr, 0))).toBe("c4*2");
		expect(exprToString(projectVoice(expr, 1))).toBe("e4*2");
	});

	it("projects groups inside stacks", () => {
		// {[a b], c} -> Voice 0: [a b], Voice 1: c
		const expr = parseExpr("{[c4 d4], e4}");
		expect(voiceCount(expr)).toBe(2);

		expect(exprToString(projectVoice(expr, 0))).toBe("[c4 d4]");
		expect(exprToString(projectVoice(expr, 1))).toBe("e4");
	});

	it("projects alternation inside stacks", () => {
		// {<a b>, c} -> Voice 0: <a b>, Voice 1: c
		const expr = parseExpr("{<c4 d4>, e4}");
		expect(voiceCount(expr)).toBe(2);

		expect(exprToString(projectVoice(expr, 0))).toBe("<c4 d4>");
		expect(exprToString(projectVoice(expr, 1))).toBe("e4");
	});

	it("projects stack inside alternation", () => {
		// <{a, b} {c, d}> -> Voice 0: <a c>, Voice 1: <b d>
		const expr = parseExpr("<{c4, e4} {g4, b4}>");
		expect(voiceCount(expr)).toBe(2);

		expect(exprToString(projectVoice(expr, 0))).toBe("<c4 g4>");
		expect(exprToString(projectVoice(expr, 1))).toBe("<e4 b4>");
	});

	it("projects stack inside group", () => {
		// [{a, b} c] -> Voice 0: [a c], Voice 1: [b c]
		const expr = parseExpr("[{c4, e4} g4]");
		expect(voiceCount(expr)).toBe(2);

		expect(exprToString(projectVoice(expr, 0))).toBe("[c4 g4]");
		expect(exprToString(projectVoice(expr, 1))).toBe("[e4 g4]");
	});

	it("projects polyrhythm (different step counts per voice)", () => {
		// {c4 d4 e4, g3 a3} -> Voice 0: c4 d4 e4, Voice 1: g3 a3
		const expr = parseExpr("{c4 d4 e4, g3 a3}");
		expect(voiceCount(expr)).toBe(2);

		expect(exprToString(projectVoice(expr, 0))).toBe("c4 d4 e4");
		expect(exprToString(projectVoice(expr, 1))).toBe("g3 a3");
	});

	it("projects probability on stacks", () => {
		// {a, b}? -> Voice 0: a?0.5, Voice 1: b?0.5
		const expr = parseExpr("{c4, e4}?");
		expect(voiceCount(expr)).toBe(2);

		expect(exprToString(projectVoice(expr, 0))).toBe("c4?0.5");
		expect(exprToString(projectVoice(expr, 1))).toBe("e4?0.5");
	});

	it("projects euclidean on stacks", () => {
		const expr = parseExpr("{c4, e4}(3,8)");
		expect(voiceCount(expr)).toBe(2);

		expect(exprToString(projectVoice(expr, 0))).toBe("c4(3,8)");
		expect(exprToString(projectVoice(expr, 1))).toBe("e4(3,8)");
	});

	it("projects mono pattern unchanged", () => {
		const expr = parseExpr("c4 d4 e4");
		expect(voiceCount(expr)).toBe(1);
		expect(exprToString(projectVoice(expr, 0))).toBe("c4 d4 e4");
	});

	it("projects tie (single voice, gate behavior only)", () => {
		const expr = parseExpr("c4_d4_e4");
		expect(voiceCount(expr)).toBe(1);
		expect(exprToString(projectVoice(expr, 0))).toBe("c4_d4_e4");
	});

	it("throws on invalid voice index", () => {
		const expr = parseExpr("{c4, e4}");
		expect(() => projectVoice(expr, 2)).toThrow("Voice index 2 out of range");
	});
});

describe("decomposePattern", () => {
	it("decomposes 3-voice chord", () => {
		const expr = parseExpr("{c4, e4, g4}");
		const decomposed = decomposePattern(expr);

		expect(decomposed.length).toBe(3);
		expect(exprToString(decomposed[0])).toBe("c4");
		expect(exprToString(decomposed[1])).toBe("e4");
		expect(exprToString(decomposed[2])).toBe("g4");
	});

	it("decomposes polyrhythm", () => {
		const expr = parseExpr("{c4 d4 e4, g3 a3}");
		const decomposed = decomposePattern(expr);

		expect(decomposed.length).toBe(2);
		expect(exprToString(decomposed[0])).toBe("c4 d4 e4");
		expect(exprToString(decomposed[1])).toBe("g3 a3");
	});

	it("returns single-element array for mono pattern", () => {
		const expr = parseExpr("c4 d4 e4");
		const decomposed = decomposePattern(expr);

		expect(decomposed.length).toBe(1);
		expect(exprToString(decomposed[0])).toBe("c4 d4 e4");
	});

	it("decomposes nested stacks", () => {
		const expr = parseExpr("{c4, {e4, g4}, b4}");
		const decomposed = decomposePattern(expr);

		expect(decomposed.length).toBe(4);
		expect(exprToString(decomposed[0])).toBe("c4");
		expect(exprToString(decomposed[1])).toBe("e4");
		expect(exprToString(decomposed[2])).toBe("g4");
		expect(exprToString(decomposed[3])).toBe("b4");
	});
});
