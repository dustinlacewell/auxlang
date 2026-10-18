/**
 * The main thread's monitor receiver: frames reach the listeners with their
 * program's watches; stale frames and unknown programs reach nobody.
 */

import type { MonitorFrame, Watch } from "@/engine/runtime/live/live-contract";
import { MonitorReceiver } from "@/engine/runtime/live/monitor-receiver";
import { describe, expect, it } from "vitest";

const frame = (generation: number): MonitorFrame => ({
	type: "monitor",
	generation,
	frame: 0,
	levelCount: 0,
	onsetCount: 0,
	buffer: new ArrayBuffer(8),
});

const watches = (node: number): Watch[] => [{ node, port: "out", site: node, module: "sin" }];

describe("MonitorReceiver", () => {
	it("is active while a listener is attached; add and remove say first and last", () => {
		const receiver = new MonitorReceiver();
		const a = () => {};
		const b = () => {};
		expect(receiver.add(a)).toBe(true);
		expect(receiver.add(b)).toBe(false);
		expect(receiver.active).toBe(true);
		expect(receiver.remove(a)).toBe(false);
		expect(receiver.remove(b)).toBe(true);
		expect(receiver.active).toBe(false);
	});

	it("hands each frame its program's watches and drops frames older than the latest", () => {
		const receiver = new MonitorReceiver();
		const seen: [number, number][] = [];
		receiver.add((f, w) => seen.push([f.generation, w[0]?.node as number]));
		receiver.posted(3, watches(30), []);
		receiver.posted(4, watches(40), []);
		receiver.receive(frame(3));
		receiver.receive(frame(4));
		receiver.receive(frame(3));
		receiver.receive(frame(5));
		expect(seen).toEqual([
			[3, 30],
			[4, 40],
		]);
	});
});
