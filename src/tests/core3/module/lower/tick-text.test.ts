/**
 * `tickText` rewrites an author's tick into the internal `(s, i, o, cfg, sr,
 * width) => ...` text: port locals, setup locals, config keys and file
 * consts become `__dsp_i.*`/`__dsp_s.*`/`__dsp_cfg.*`/literals; `sr`/`width`
 * and a shadowing tick local are left as written.
 */

import { describe, expect, it } from "vitest";

import { fileProgram } from "@/core3/module/lower/file-program";
import { fileScope } from "@/core3/module/lower/file-scope";
import { findSetup } from "@/core3/module/lower/find-setup";
import { inferOuts } from "@/core3/module/lower/infer-outs";
import { inferPorts } from "@/core3/module/lower/infer-ports";
import { setupParts } from "@/core3/module/lower/setup-parts";
import { tickText } from "@/core3/module/lower/tick-text";
import type { SourceText } from "@/core3/module/source-text";

function lowerTick(fileText: string, setupText: string) {
	const source: SourceText = { file: "patch", text: fileText };
	const program = fileProgram(source);
	const found = findSetup(program, fileText, setupText);
	if (found === null) throw new Error("test setup: findSetup found nothing");
	const parts = setupParts(found.setup, "module 'echo'");
	const ports = inferPorts(parts.tick, "echo");
	const outs = inferOuts(parts.tick, "echo");
	const setupLocals = new Set(parts.locals);
	const configKeys = new Set(parts.params.config.map((k) => k.name));
	const scope = fileScope(program);
	return { parts, ports, outs, setupLocals, configKeys, scope, fileText };
}

describe("tickText", () => {
	it("the echo example: __dsp_i.in, __dsp_s.buf, inlined DEPTH const", () => {
		const fileText = [
			"const DEPTH = 0.5",
			'defmod("echo", {}, ({ sr, taps = 3 }) => {',
			"  const buf = new Float64Array(sr)",
			"  let w = 0",
			"  return ({ in: x = 0, time = secs(0.25) }) => {",
			"    const y = x + buf[w] * DEPTH",
			"    buf[w] = y; w = (w + 1) % buf.length",
			"    return y",
			"  }",
			"})",
		].join("\n");
		const setupText = [
			"({ sr, taps = 3 }) => {",
			"  const buf = new Float64Array(sr)",
			"  let w = 0",
			"  return ({ in: x = 0, time = secs(0.25) }) => {",
			"    const y = x + buf[w] * DEPTH",
			"    buf[w] = y; w = (w + 1) % buf.length",
			"    return y",
			"  }",
			"}",
		].join("\n");
		const { parts, ports, outs, setupLocals, configKeys, scope, fileText: file } = lowerTick(fileText, setupText);

		const text = tickText(parts.tick, file, ports, outs, setupLocals, configKeys, scope, new Set(), "echo");

		expect(text).toContain("__dsp_i.in");
		expect(text).toContain("__dsp_s.buf");
		expect(text).toContain("(0.5)");
		expect(text).not.toContain("DEPTH");
		expect(text).toContain("__dsp_o.out = (y); return;");
	});

	it("a tick local shadowing a setup local is not rewritten", () => {
		const fileText = [
			'defmod("shadow", {}, ({ sr }) => {',
			"  const buf = 1",
			"  return ({ in: x = 0 }) => {",
			"    const buf = x * 2",
			"    return buf",
			"  }",
			"})",
		].join("\n");
		const setupText = [
			"({ sr }) => {",
			"  const buf = 1",
			"  return ({ in: x = 0 }) => {",
			"    const buf = x * 2",
			"    return buf",
			"  }",
			"}",
		].join("\n");
		const { parts, ports, outs, setupLocals, configKeys, scope, fileText: file } = lowerTick(fileText, setupText);

		const text = tickText(parts.tick, file, ports, outs, setupLocals, configKeys, scope, new Set(), "shadow");

		expect(text).not.toContain("__dsp_s.buf");
		expect(text).toContain("const buf = __dsp_i.in * 2");
	});

	it("newline count is preserved, including a multi-line param list", () => {
		const fileText = [
			'defmod("echo", {}, ({ sr }) => {',
			"  return ({",
			"    in: x = 0,",
			"    time = secs(0.25),",
			"  }) => {",
			"    return x + time",
			"  }",
			"})",
		].join("\n");
		const setupText = [
			"({ sr }) => {",
			"  return ({",
			"    in: x = 0,",
			"    time = secs(0.25),",
			"  }) => {",
			"    return x + time",
			"  }",
			"}",
		].join("\n");
		const { parts, ports, outs, setupLocals, configKeys, scope, fileText: file } = lowerTick(fileText, setupText);

		const text = tickText(parts.tick, file, ports, outs, setupLocals, configKeys, scope, new Set(), "echo");
		const originalNewlines = (fileText.slice(parts.tick.start, parts.tick.end).match(/\n/g) ?? []).length;
		const newNewlines = (text.match(/\n/g) ?? []).length;
		expect(newNewlines).toBe(originalNewlines);
	});

	it("a bare port-local expression body (the whole tick is `=> x`) is rewritten too", () => {
		const fileText = [
			'defmod("z1", {}, () => {',
			"  return ({ in: x = 0 }) => x",
			"})",
		].join("\n");
		const setupText = ["() => {", "  return ({ in: x = 0 }) => x", "}"].join("\n");
		const { parts, ports, outs, setupLocals, configKeys, scope, fileText: file } = lowerTick(fileText, setupText);

		const text = tickText(parts.tick, file, ports, outs, setupLocals, configKeys, scope, new Set(), "z1");

		expect(text).toContain("__dsp_o.out = (__dsp_i.in); return;");
		expect(text).not.toContain("(x)");
	});

	it("writing to a port local throws", () => {
		const fileText = [
			'defmod("bad", {}, ({ sr }) => {',
			"  return ({ in: x = 0 }) => {",
			"    x = x + 1",
			"    return x",
			"  }",
			"})",
		].join("\n");
		const setupText = ["({ sr }) => {", "  return ({ in: x = 0 }) => {", "    x = x + 1", "    return x", "  }", "}"].join(
			"\n",
		);
		const { parts, ports, outs, setupLocals, configKeys, scope, fileText: file } = lowerTick(fileText, setupText);

		expect(() => tickText(parts.tick, file, ports, outs, setupLocals, configKeys, scope, new Set(), "bad")).toThrow(
			/port binding/,
		);
	});
});
