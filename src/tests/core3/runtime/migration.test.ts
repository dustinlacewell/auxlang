import { describe, expect, it } from "vitest";

import { defineModule, getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { sig } from "@/core3/types";
import { c, pnode, prog, type IO, type St } from "./helpers";

defineModule({
	name: "mg.count",
	ins: { step: sig(1) },
	outs: { out: sig() },
	defaultIn: "step",
	defaultOut: "out",
	state: () => ({ n: 0, buf: new Float32Array(4) }),
	tick: (s: St, ins: IO, o: IO) => {
		s.n = (s.n as number) + (ins.step as number);
		const buf = s.buf as Float32Array;
		buf[0] = (buf[0] as number) + 1;
		o.out = s.n as number;
	},
});

const SR = 48000;

function tapRun(engine: Core3Engine, node: number, samples: number): number[] {
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let i = 0; i < samples; i++) {
		engine.tick(frame);
		out.push(engine.peek(node, "out", 0));
	}
	return out;
}

describe("engine: state migration", () => {
	const program = prog([
		pnode("mg.count", [{ step: c(1) }], { id: "a" }),
		pnode("mg.count", [{ step: c(2) }], { id: "b" }),
	]);

	it("is seamless: rebuilt engine matches an un-swapped reference exactly", () => {
		const registry = getRegistry();

		const reference = new Core3Engine(program, SR, registry);
		tapRun(reference, 0, 100);
		const expectedA = tapRun(reference, 0, 100);

		const first = new Core3Engine(program, SR, registry);
		tapRun(first, 0, 100);
		const swapped = new Core3Engine(program, SR, registry, first.collectState());
		const gotA = tapRun(swapped, 0, 100);

		expect(gotA).toEqual(expectedA);
		expect(swapped.sampleCount).toBe(reference.sampleCount);
	});

	it("typed-array state migrates by value (deep-cloned, not shared)", () => {
		const registry = getRegistry();
		const first = new Core3Engine(program, SR, registry);
		tapRun(first, 0, 10);
		const state = first.collectState();
		const swapped = new Core3Engine(program, SR, registry, state);
		tapRun(swapped, 0, 5);
		// mutating the swapped engine must not have touched the snapshot
		const lanes = state.nodes.a as Record<string, unknown>[];
		expect(((lanes[0] as Record<string, unknown>).buf as Float32Array)[0]).toBe(10);
	});

	it("changed-id node resets while others keep state", () => {
		const registry = getRegistry();
		const first = new Core3Engine(program, SR, registry);
		tapRun(first, 0, 100); // a: 100, b: 200

		const changed = prog([
			pnode("mg.count", [{ step: c(1) }], { id: "a" }),
			pnode("mg.count", [{ step: c(2) }], { id: "c" }), // new identity
		]);
		const swapped = new Core3Engine(changed, SR, registry, first.collectState());
		const frame = new Float32Array(2);
		swapped.tick(frame);
		expect(swapped.peek(0, "out", 0)).toBe(101); // kept state
		expect(swapped.peek(1, "out", 0)).toBe(2); // fresh state
	});

	it("pin overrides structural id", () => {
		const registry = getRegistry();
		const pinned = prog([pnode("mg.count", [{ step: c(1) }], { id: "x", pin: "keep" })]);
		const first = new Core3Engine(pinned, SR, registry);
		tapRun(first, 0, 50);

		const restructured = prog([pnode("mg.count", [{ step: c(1) }], { id: "y", pin: "keep" })]);
		const swapped = new Core3Engine(restructured, SR, registry, first.collectState());
		const frame = new Float32Array(2);
		swapped.tick(frame);
		expect(swapped.peek(0, "out", 0)).toBe(51);
	});
});
