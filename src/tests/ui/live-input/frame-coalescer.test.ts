import { FrameCoalescer, type FrameScheduler } from "@/ui/core3-editor/live-input/frame-coalescer";
import { describe, expect, it } from "vitest";

function fakeScheduler(): FrameScheduler & { fire: () => void } {
	let callback: (() => void) | null = null;
	return {
		schedule: (cb) => {
			callback = cb;
		},
		fire: () => {
			callback?.();
			callback = null;
		},
	};
}

describe("FrameCoalescer", () => {
	it("coalesces many pushes in one frame into a single flush", () => {
		const flushes: ReadonlyMap<number, number>[] = [];
		const scheduler = fakeScheduler();
		const coalescer = new FrameCoalescer((writes) => flushes.push(writes), scheduler);

		for (let i = 0; i < 10; i++) coalescer.push(0, i);
		scheduler.fire();

		expect(flushes).toHaveLength(1);
		expect(flushes[0]?.get(0)).toBe(9);
	});

	it("only schedules once per frame regardless of push count", () => {
		let scheduleCalls = 0;
		const scheduler: FrameScheduler = {
			schedule: () => {
				scheduleCalls++;
			},
		};
		const coalescer = new FrameCoalescer(() => {}, scheduler);
		coalescer.push(0, 1);
		coalescer.push(1, 2);
		coalescer.push(0, 3);
		expect(scheduleCalls).toBe(1);
	});

	it("keeps the latest value per slot and schedules again after a flush", () => {
		const flushes: ReadonlyMap<number, number>[] = [];
		const scheduler = fakeScheduler();
		const coalescer = new FrameCoalescer((writes) => flushes.push(writes), scheduler);

		coalescer.push(0, 1);
		coalescer.push(1, 2);
		scheduler.fire();
		coalescer.push(0, 5);
		scheduler.fire();

		expect(flushes).toHaveLength(2);
		expect(flushes[1]?.get(0)).toBe(5);
		expect(flushes[1]?.has(1)).toBe(false);
	});
});
