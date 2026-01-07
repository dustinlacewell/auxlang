import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenize";

describe("tokenize", () => {
	it("tokenizes a single note", () => {
		const tokens = tokenize("c4");
		expect(tokens).toEqual([
			{ type: "NOTE", value: "c4", position: 0 },
			{ type: "EOF", value: "", position: 2 },
		]);
	});

	it("tokenizes multiple notes", () => {
		const tokens = tokenize("c4 e4 g4");
		expect(tokens).toHaveLength(4); // 3 notes + EOF
		expect(tokens[0]).toEqual({ type: "NOTE", value: "c4", position: 0 });
		expect(tokens[1]).toEqual({ type: "NOTE", value: "e4", position: 3 });
		expect(tokens[2]).toEqual({ type: "NOTE", value: "g4", position: 6 });
		expect(tokens[3]).toEqual({ type: "EOF", value: "", position: 8 });
	});

	it("tokenizes notes with accidentals", () => {
		const tokens = tokenize("c#4 db4");
		expect(tokens[0]).toEqual({ type: "NOTE", value: "c#4", position: 0 });
		expect(tokens[1]).toEqual({ type: "NOTE", value: "db4", position: 4 });
	});

	it("tokenizes notes without octave", () => {
		const tokens = tokenize("c e g");
		expect(tokens[0]).toEqual({ type: "NOTE", value: "c", position: 0 });
		expect(tokens[1]).toEqual({ type: "NOTE", value: "e", position: 2 });
		expect(tokens[2]).toEqual({ type: "NOTE", value: "g", position: 4 });
	});

	it("tokenizes rests", () => {
		const tokens = tokenize("c4 ~ e4");
		expect(tokens).toHaveLength(4);
		expect(tokens[1]).toEqual({ type: "REST", value: "~", position: 3 });
	});

	it("tokenizes brackets", () => {
		const tokens = tokenize("[c4 e4]");
		expect(tokens).toHaveLength(5);
		expect(tokens[0]).toEqual({ type: "LBRACKET", value: "[", position: 0 });
		expect(tokens[1]).toEqual({ type: "NOTE", value: "c4", position: 1 });
		expect(tokens[2]).toEqual({ type: "NOTE", value: "e4", position: 4 });
		expect(tokens[3]).toEqual({ type: "RBRACKET", value: "]", position: 6 });
		expect(tokens[4]).toEqual({ type: "EOF", value: "", position: 7 });
	});

	it("tokenizes nested brackets", () => {
		const tokens = tokenize("[[c4]]");
		expect(tokens[0]).toEqual({ type: "LBRACKET", value: "[", position: 0 });
		expect(tokens[1]).toEqual({ type: "LBRACKET", value: "[", position: 1 });
		expect(tokens[2]).toEqual({ type: "NOTE", value: "c4", position: 2 });
		expect(tokens[3]).toEqual({ type: "RBRACKET", value: "]", position: 4 });
		expect(tokens[4]).toEqual({ type: "RBRACKET", value: "]", position: 5 });
	});

	it("handles uppercase notes", () => {
		const tokens = tokenize("C4 E4");
		expect(tokens[0]).toEqual({ type: "NOTE", value: "C4", position: 0 });
		expect(tokens[1]).toEqual({ type: "NOTE", value: "E4", position: 3 });
	});

	it("handles empty string", () => {
		const tokens = tokenize("");
		expect(tokens).toEqual([{ type: "EOF", value: "", position: 0 }]);
	});

	it("handles extra whitespace", () => {
		const tokens = tokenize("  c4   e4  ");
		expect(tokens).toHaveLength(3);
		expect(tokens[0]?.type).toBe("NOTE");
		expect(tokens[1]?.type).toBe("NOTE");
		expect(tokens[2]?.type).toBe("EOF");
	});

	it("throws on invalid character", () => {
		expect(() => tokenize("c4 x4")).toThrow("Unexpected character");
		expect(() => tokenize("c4 % e4")).toThrow("Unexpected character");
	});
});
