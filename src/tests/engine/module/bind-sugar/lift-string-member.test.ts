/**
 * `s["n"]` lifts to `s.n` (card step 6) when the string key is a valid
 * identifier; any other key is left for the front end's own check to refuse.
 */

import { describe, expect, it } from "vitest";

import { liftStringMember } from "@/engine/module/bind-sugar/lift-string-member";

describe("liftStringMember", () => {
	it("a state field string key becomes the dot form", () => {
		const src = '(s, i, o) => { o.out = s["n"]; }';
		expect(liftStringMember(src, "test")).toBe('(s, i, o) => { o.out = s.n; }');
	});

	it("a local record string key becomes the dot form", () => {
		const src = '(s, i, o) => { const v = s.v; o.out = v["x"]; }';
		expect(liftStringMember(src, "test")).toBe('(s, i, o) => { const v = s.v; o.out = v.x; }');
	});

	it("a key that is not a valid identifier is left as written", () => {
		const src = '(s, i, o) => { o.out = s["1a"]; }';
		expect(liftStringMember(src, "test")).toBe(src);
	});

	it("text with no computed string key is returned unchanged", () => {
		const src = "(s, i, o) => { o.out = s.buf[0]; }";
		expect(liftStringMember(src, "test")).toBe(src);
	});
});
