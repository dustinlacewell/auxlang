import { describe, expect, it } from "vitest";

import { getRegistry } from "@/dsp/define";
import { defmod } from "@/patch/defmod";
import { BACKENDS, type TestEngine } from "../../testing/backends";
import { c, pnode, prog } from "./helpers";

defmod("mg.count", {}, () => {
	let n = 0;
	const buf = new Float32Array(4);
	return ({ step = 1 }) => {
		n = n + step;
		buf[0] = (buf[0] as number) + 1;
		return n;
	};
});

/** Same ports and keys as mg.count, a longer buffer. */
defmod("mg.long", {}, () => {
	let n = 0;
	const buf = new Float32Array(8);
	return ({ step = 1 }) => {
		n = n + step;
		buf[0] = (buf[0] as number) + 1;
		return n + buf[0] * 0;
	};
});

const SR = 48000;

function tapRun(engine: TestEngine, node: number, samples: number): number[] {
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let i = 0; i < samples; i++) {
		engine.tick(frame);
		out.push(engine.peek(node, "out", 0));
	}
	return out;
}

describe.each(BACKENDS)("engine: state migration ($name)", ({ create, swap }) => {
	const program = prog([
		pnode("mg.count", [{ step: c(1) }], { place: "a" }),
		pnode("mg.count", [{ step: c(2) }], { place: "b" }),
	]);

	it("is seamless: rebuilt engine matches an un-swapped reference exactly", () => {
		const registry = getRegistry();

		const reference = create(program, SR, registry);
		tapRun(reference, 0, 100);
		const expectedA = tapRun(reference, 0, 100);

		const first = create(program, SR, registry);
		tapRun(first, 0, 100);
		const swapped = swap(program, SR, registry, first);
		const gotA = tapRun(swapped, 0, 100);

		expect(gotA).toEqual(expectedA);
		expect(swapped.sampleCount).toBe(reference.sampleCount);
	});

	it("continues a snapshot exactly", () => {
		const registry = getRegistry();
		const reference = create(program, SR, registry);
		tapRun(reference, 0, 100);
		const expectedA = tapRun(reference, 0, 100);

		const first = create(program, SR, registry);
		tapRun(first, 0, 100);
		const restored = create(program, SR, registry, first.collectState());
		expect(tapRun(restored, 0, 100)).toEqual(expectedA);
		expect(restored.sampleCount).toBe(reference.sampleCount);
	});

	it("typed-array state migrates by value (deep-cloned, not shared)", () => {
		const registry = getRegistry();
		const first = create(program, SR, registry);
		tapRun(first, 0, 10);
		const state = first.collectState();
		const swapped = create(program, SR, registry, state);
		tapRun(swapped, 0, 5);
		// mutating the swapped engine must not have touched the snapshot
		const lanes = state.nodes.a as Record<string, unknown>[];
		expect(((lanes[0] as Record<string, unknown>).buf as Float32Array)[0]).toBe(10);
	});

	it("a node at a new place keeps the state of the leftover node of its kind", () => {
		const registry = getRegistry();
		const first = create(program, SR, registry);
		tapRun(first, 0, 100); // a: 100, b: 200

		const moved = prog([
			pnode("mg.count", [{ step: c(1) }], { place: "a" }),
			pnode("mg.count", [{ step: c(2) }], { place: "c" }), // b, moved
		]);
		const swapped = swap(moved, SR, registry, first);
		const frame = new Float32Array(2);
		swapped.tick(frame);
		expect(swapped.peek(0, "out", 0)).toBe(101); // kept state
		expect(swapped.peek(1, "out", 0)).toBe(202); // b's state, matched by kind
	});

	it("a new node starts fresh while the others keep state", () => {
		const registry = getRegistry();
		const first = create(program, SR, registry);
		tapRun(first, 0, 100); // a: 100, b: 200

		const grown = prog([
			pnode("mg.count", [{ step: c(1) }], { place: "a" }),
			pnode("mg.count", [{ step: c(2) }], { place: "b" }),
			pnode("mg.count", [{ step: c(3) }], { place: "c" }), // new
		]);
		const swapped = swap(grown, SR, registry, first);
		const frame = new Float32Array(2);
		swapped.tick(frame);
		expect(swapped.peek(0, "out", 0)).toBe(101); // kept state
		expect(swapped.peek(1, "out", 0)).toBe(202); // kept state
		expect(swapped.peek(2, "out", 0)).toBe(3); // fresh state
	});

	it("a matched node whose own config changed keeps its state", () => {
		const registry = getRegistry();
		const configured = (k: number) =>
			prog([
				pnode("mg.count", [{ step: c(1) }], { place: "a" }),
				pnode("mg.count", [{ step: c(2) }], { place: "b", config: { k } }),
			]);
		const first = create(configured(1), SR, registry);
		tapRun(first, 0, 100); // a: 100, b: 200

		const swapped = swap(configured(2), SR, registry, first);
		const frame = new Float32Array(2);
		swapped.tick(frame);
		expect(swapped.peek(0, "out", 0)).toBe(101); // kept state
		expect(swapped.peek(1, "out", 0)).toBe(202); // kept state: config is not consulted
	});

	it("a matched node whose buffer changed length resets alone", () => {
		const registry = getRegistry();
		const first = create(program, SR, registry);
		tapRun(first, 0, 100); // a: 100, b: 200

		const resized = prog([
			pnode("mg.count", [{ step: c(1) }], { place: "a" }),
			pnode("mg.long", [{ step: c(2) }], { place: "b" }), // same place, longer buffer
		]);
		const swapped = swap(resized, SR, registry, first);
		const frame = new Float32Array(2);
		swapped.tick(frame);
		expect(swapped.peek(0, "out", 0)).toBe(101); // kept state
		expect(swapped.peek(1, "out", 0)).toBe(2); // fresh state
	});

	it("never carries a lane's scratch", () => {
		const registry = getRegistry();
		const first = create(program, SR, registry);
		tapRun(first, 0, 10);
		const state = first.collectState();
		for (const lanes of Object.values(state.nodes)) {
			for (const lane of lanes) expect(lane).not.toHaveProperty("__scratch");
		}
	});

	it("a pin matches before place and kind", () => {
		const registry = getRegistry();
		const pinned = prog([
			pnode("mg.count", [{ step: c(1) }], { place: "x", pin: "keep" }),
			pnode("mg.count", [{ step: c(2) }], { place: "b" }),
		]);
		const first = create(pinned, SR, registry);
		tapRun(first, 0, 50); // keep: 50, b: 100

		// Both moved and swapped order: by kind alone, node 0 would take keep's state.
		const restructured = prog([
			pnode("mg.count", [{ step: c(2) }], { place: "q" }),
			pnode("mg.count", [{ step: c(1) }], { place: "y", pin: "keep" }),
		]);
		const swapped = swap(restructured, SR, registry, first);
		const frame = new Float32Array(2);
		swapped.tick(frame);
		expect(swapped.peek(0, "out", 0)).toBe(102);
		expect(swapped.peek(1, "out", 0)).toBe(51);
	});
});
