/**
 * Sub-patch modules (MANIFESTO §5): `defmod({ name, ins, outs, patch })` is a
 * module with the same ports, chaining, positional args and identity as any
 * other. Compile expands each instance into plain nodes, so it renders exactly
 * like the same graph written inline. Each instance is its own machine; its
 * inner nodes take places nested under it, so an unchanged re-eval is
 * bit-exact and a constant edit inside keeps their state.
 */

import { describe, expect, it } from "vitest";

import "@/core3/modules/all";
import { type Handle, defmod, factory, loop, runProgram, seq } from "@/core3/api";
import { getRegistry } from "@/core3/module/define";
import { Core3Engine } from "@/core3/runtime/engine";
import { withProgramSpecs } from "@/core3/runtime/hydrate-specs";
import { match } from "@/core3/runtime/match";
import type { EngineState, Program } from "@/core3/types";
import { sig } from "@/core3/types";
import { hz, semis } from "@/core3/units/tag";

const SR = 48000;
const saw = factory("saw");
const lfo = factory("lfo");

function engine(program: Program, prev?: EngineState): Core3Engine {
	return new Core3Engine(program, SR, withProgramSpecs(getRegistry(), program), prev);
}

function render(program: Program, samples = 2400): number[] {
	const e = engine(program);
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let k = 0; k < samples; k++) {
		e.tick(frame);
		out.push(frame[0] as number, frame[1] as number);
	}
	return out;
}

function run(e: Core3Engine, samples: number): number[] {
	const frame = new Float32Array(2);
	const out: number[] = [];
	for (let k = 0; k < samples; k++) {
		e.tick(frame);
		out.push(frame[0] as number, frame[1] as number);
	}
	return out;
}

const bitExact = (a: readonly number[], b: readonly number[]): boolean =>
	a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

/** Two programs sound, and sound the same to the bit. */
function expectSameSound(a: Program, b: Program): void {
	const left = render(a);
	expect(Math.max(...left.map(Math.abs))).toBeGreaterThan(0.01);
	expect(bitExact(left, render(b))).toBe(true);
}

/** A filtered saw voice; `res` lets a test edit one constant inside. */
const defVoice = (res = 0.3) =>
	defmod({
		name: "voice",
		ins: { pitch: semis(57), cutoff: semis(84) },
		outs: { out: sig() },
		patch: (i) => ({ out: i.pitch.saw().lpf({ cutoff: i.cutoff, res }).mul(0.5) }),
	});

/** A filter whose first input takes a chain. */
const defFilt = () =>
	defmod({
		name: "filt",
		ins: { in: sig(0), cutoff: semis(84) },
		outs: { out: sig() },
		patch: (i) => ({ out: i.in.lpf({ cutoff: i.cutoff, res: 0.4 }) }),
	});

describe("a sub-patch renders like the same graph inline", () => {
	it("constant inputs", () => {
		const sub = runProgram(() => {
			defVoice()(48).out();
		});
		const inline = runProgram(() => {
			saw(48).lpf({ cutoff: 84, res: 0.3 }).mul(0.5).out();
		});
		expect(sub.nodes.map((n) => n.module)).toEqual(inline.nodes.map((n) => n.module));
		expectSameSound(sub, inline);
	});

	it("a .mod on the instance's port", () => {
		const sub = runProgram(() => {
			defVoice()(48).mod("cutoff", lfo(3), 12).out();
		});
		const inline = runProgram(() => {
			saw(48).lpf({ cutoff: 84, res: 0.3 }).mod("cutoff", lfo(3), 12).mul(0.5).out();
		});
		expectSameSound(sub, inline);
	});

	it("a loop inside the sub-patch", () => {
		const sub = runProgram(() => {
			const echo = defmod({
				name: "echo",
				ins: { in: sig(0) },
				outs: { out: sig() },
				patch: (i) => ({ out: loop((fb) => i.in.add(fb.delay({ time: 0.01, mix: 1 }).mul(0.5))) }),
			});
			echo(saw(45).mul(0.3)).out();
		});
		const inline = runProgram(() => {
			const dry = saw(45).mul(0.3);
			loop((fb) => dry.add(fb.delay({ time: 0.01, mix: 1 }).mul(0.5))).out();
		});
		expectSameSound(sub, inline);
	});

	it("a sub-patch inside a sub-patch", () => {
		const sub = runProgram(() => {
			defFilt();
			defmod({
				name: "bright",
				ins: { pitch: semis(57) },
				outs: { out: sig() },
				patch: (i) => ({ out: i.pitch.saw().filt(96).mul(0.5) }),
			})(45).out();
		});
		const inline = runProgram(() => {
			saw(45).lpf({ cutoff: 96, res: 0.4 }).mul(0.5).out();
		});
		expectSameSound(sub, inline);
	});

	it("a stereo sub-patch (outs l, r) connects to out by name", () => {
		const sub = runProgram(() => {
			defmod({
				name: "wide",
				ins: { in: sig(0) },
				outs: { l: sig(), r: sig() },
				patch: (i) => i.in.pan(0.5).apply((p: Handle) => ({ l: p.l, r: p.r })),
			})(saw(45).mul(0.3)).out();
		});
		const inline = runProgram(() => {
			saw(45).mul(0.3).pan(0.5).out();
		});
		expectSameSound(sub, inline);
	});

	it("feedback around a sub-patch, through loop outside it", () => {
		const sub = runProgram(() => {
			defFilt();
			loop((fb) => saw(45).mul(0.3).add(fb.filt(80).mul(0.5))).out();
		});
		const inline = runProgram(() => {
			loop((fb) =>
				saw(45)
					.mul(0.3)
					.add(fb.lpf({ cutoff: 80, res: 0.4 }).mul(0.5)),
			).out();
		});
		expectSameSound(sub, inline);
	});

	it("a sub-patch as the loop body's output (the z-edge reads its inner output)", () => {
		const sub = runProgram(() => {
			defFilt();
			loop((fb) => saw(45).mul(0.3).add(fb.mul(0.5)).filt(80)).out();
		});
		const inline = runProgram(() => {
			loop((fb) => saw(45).mul(0.3).add(fb.mul(0.5)).lpf({ cutoff: 80, res: 0.4 })).out();
		});
		expectSameSound(sub, inline);
	});

	it("width flows through: a two-note chord gives two-lane inner nodes", () => {
		const program = runProgram(() => {
			const s = seq("[c3,e3]", factory("clock")(120));
			defVoice()(s).out();
		});
		expect(program.nodes.find((n) => n.module === "saw")?.width).toBe(2);
		expect(program.nodes.find((n) => n.module === "lpf")?.width).toBe(2);
	});
});

describe("ports: chaining, positional args, setters, units", () => {
	const inline = runProgram(() => {
		saw(48).lpf({ cutoff: 70, res: 0.4 }).out();
	});
	const cases: [string, () => void][] = [
		[
			"chaining binds the first input; a positional fills the next",
			() => {
				defFilt();
				saw(48).filt(70).out();
			},
		],
		["positional args follow ins order", () => defFilt()(saw(48), 70).out()],
		["named args", () => defFilt()({ in: saw(48), cutoff: 70 }).out()],
		["a setter", () => defFilt()(saw(48)).cutoff(70).out()],
	];
	for (const [label, body] of cases) {
		it(label, () => expectSameSound(runProgram(body), inline));
	}

	it("a unit tag converts at the outer port", () => {
		const sub = runProgram(() => {
			defFilt();
			saw(48).filt(hz(1000)).out();
		});
		const direct = runProgram(() => {
			saw(48)
				.lpf({ cutoff: hz(1000), res: 0.4 })
				.out();
		});
		expectSameSound(sub, direct);
	});
});

describe("identity: each instance is its own machine", () => {
	const pair = (res = 0.3) =>
		runProgram(() => {
			const voice = defVoice(res);
			voice(57).add(voice(64)).gain(0.3).out();
		});

	it("two instances give two independent sets of inner nodes at different places", () => {
		const program = pair();
		const saws = program.nodes.filter((n) => n.module === "saw");
		expect(saws).toHaveLength(2);
		expect(saws[0]?.place).not.toBe(saws[1]?.place);
	});

	it("an unchanged re-eval is bit-exact: both instances keep their state", () => {
		const reference = engine(pair());
		run(reference, 3000);
		const expected = run(reference, 2000);
		const head = engine(pair());
		run(head, 3000);
		const got = run(engine(pair(), head.collectState()), 2000);
		expect(bitExact(got, expected)).toBe(true);
	});

	it("a constant edit inside keeps every inner node's place, so each keeps its state", () => {
		const before = pair(0.3);
		const after = pair(0.5);
		expect(after.nodes.map((n) => n.place)).toEqual(before.nodes.map((n) => n.place));
		const paired = match(
			before.nodes.map((n, i) => ({ ...n, key: `k${i}` })),
			after.nodes,
		);
		after.nodes.forEach((_, i) => expect(paired.get(i)).toBe(`k${i}`));
	});

	it("inner places nest under the sub-patch: inline and sub-patch places differ", () => {
		const sub = runProgram(() => {
			defVoice()(48).out();
		});
		const inline = runProgram(() => {
			saw(48).lpf({ cutoff: 84, res: 0.3 }).mul(0.5).out();
		});
		const sawPlace = (p: Program) => p.nodes.find((n) => n.module === "saw")?.place;
		expect(sawPlace(sub)).not.toBe(sawPlace(inline));
	});
});
