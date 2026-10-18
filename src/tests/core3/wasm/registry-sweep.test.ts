/**
 * Every registry module on WASM, bit-identical to the interpreter: one patch
 * per module that drives its inputs with moving signals, rendered for 1 s.
 * The table must name every registered module, so a new module needs a
 * patch here. Some modules no docs example reaches (notch, period,
 * beats2secs, secs2beats, semis2hz) are only proved here.
 */

import { describe, expect, it } from "vitest";

import { getRegistry } from "@/core3/module/define";
import { evalPatch } from "@/core3/eval-patch";
import { compareBlocks } from "./block-differential";

const SECONDS = 1;

const NOTES = `tempo(120)
const s = seq("c4 [e4 g4] ~ <b3 d4>")
`;

const DRUMS = `tempo(120)
const t = seq(p\`60(3,8)\`).trig
`;

const PATCHES: Readonly<Record<string, string>> = {
	abs: "sin(57).abs().gain(0.2).out()",
	slider: "sin(57).gain(slider(0.3, 0, 1, { slew: lfo(0.5, 0, 0.02) })).out()",
	knob: "sin(57).gain(knob(0.7, 0.1, 0.4)).out()",
	xy: `const pad = xy(0.2, 0.6, 0, 1)
sin(57).gain(pad.x).out()
sin(64).gain(pad.y).out()`,
	toggle: "sin(57).gain(toggle(1)).gain(0.2).out()",
	button: "sin(57).gain(button().add(1)).gain(0.2).out()",
	add: "sin(57).add(lfo(2, 0, 0.1)).gain(0.2).out()",
	clip: "sin(57).mul(2).clip(lfo(1, -0.9, -0.2), 0.5).gain(0.2).out()",
	gt: "sin(57).gt(lfo(1, -0.5, 0.5)).gain(0.1).out()",
	lt: "sin(57).lt(lfo(1, -0.5, 0.5)).gain(0.1).out()",
	eq: "sqr(45).eq(lfo(2).gt(0)).gain(0.1).out()",
	delay: `${NOTES}s.tri()
  .mul(s.gate.ad(0.005, 0.1))
  .delay({ time: lfo(0.5, 0.1, 0.3), feedback: 0.5, mix: 0.4, tone: 0.6 })
  .gain(0.2)
  .out()`,
	div: "sin(57).div(lfo(1, 1, 3)).gain(0.2).out()",
	clap: `${DRUMS}t.clap({ decay: lfo(0.5, 0.1, 0.4), tone: 0.6 }).gain(0.3).out()`,
	hihat: `${DRUMS}t.hihat({ decay: lfo(0.5, 0.02, 0.2), tone: 0.5, metal: 0.4 }).gain(0.3).out()`,
	kick: `${DRUMS}t.kick({ pitch: 40, sweep: lfo(0.5, 12, 30), decay: 0.3, click: 0.4 }).gain(0.3).out()`,
	snare: `${DRUMS}t.snare({ pitch: 52, tone: 0.5, decay: lfo(0.5, 0.1, 0.3), snappy: 0.6 }).gain(0.3).out()`,
	ad: `${NOTES}s.sin().mul(s.gate.ad(lfo(0.5, 0.001, 0.05), 0.2)).gain(0.2).out()`,
	ar: `${NOTES}s.sin().mul(s.gate.ar(0.01, lfo(0.5, 0.05, 0.3))).gain(0.2).out()`,
	adsr: `${NOTES}s.sin().mul(s.gate.adsr(0.01, 0.1, lfo(0.5, 0.2, 0.8), 0.2)).gain(0.2).out()`,
	fm: "fm({ pitch: 57, index: lfo(0.5, 0, 6), ratio: lfo(0.3, 1, 3) }).gain(0.2).out()",
	mix: `tempo(120)
seq("[c3,e3,g3] <[a2,c3] f2>").tri().mix().gain(0.1).out()`,
	mul: "sin(57).mul(lfo(2, 0, 0.3)).out()",
	vca: "sin(57).vca(lfo(2, 0, 0.3)).out()",
	gain: "sin(57).gain(lfo(2, 0, 0.3)).out()",
	noise: "noise({ min: lfo(0.5, -1, -0.2), max: 0.3 }).gain(0.2).out()",
	sin: "sin({ pitch: lfo(0.5, 50, 70), fm: lfo(3, 0, 20), min: -0.5, max: 0.5, phase: 0.25 }).gain(0.2).out()",
	saw: "saw({ pitch: lfo(0.5, 40, 60), fm: lfo(3, 0, 20), phase: 0.1 }).gain(0.2).out()",
	tri: "tri({ pitch: lfo(0.5, 50, 70), fm: lfo(3, 0, 20), min: -0.3 }).gain(0.2).out()",
	sqr: "sqr({ pitch: lfo(0.5, 40, 60), fm: lfo(3, 0, 20), max: 0.4 }).gain(0.2).out()",
	lfo: `sin(lfo({ freq: lfo(0.2, 0.5, 4), min: 55, max: 70, phase: 0.3, shape: "tri" })).gain(0.2).out()`,
	out: "sin(57).out({ gain: lfo(1, 0.1, 0.5) })",
	pan: "sin(hz(330)).gain(0.3).pan(lfo(0.3, -1, 1)).out()",
	period: "sin(hz(lfo(0.5, 40, 80).period().mul(1000))).gain(0.2).out()",
	phaser:
		"saw(45).phaser({ rate: lfo(0.2, 0.1, 2), depth: 0.8, feedback: 0.5, mix: 0.5 }).gain(0.2).out()",
	quantize: `quantize({
    pitch: hz(lfo(0.3, 100, 800)),
    scaleName: "pentatonic blues",
    root: lfo(0.07, 0, 11),
    octave: lfo(0.13, 2, 4),
    range: lfo(0.09, 1, 5)})
  .tri()
  .gain(0.2)
  .out()`,
	reverb: `${NOTES}s.sin().mul(s.gate.ad(0.005, 0.08)).reverb(lfo(0.5, 0.2, 0.95), 0.4, 0.6).gain(0.3).out()`,
	sah: `${NOTES}sin(noise().sah(s.trig).mul(12).add(60)).gain(0.2).out()`,
	scale: "sin(lfo(1).scale(-1, 1, 50, lfo(0.3, 60, 80))).gain(0.2).out()",
	scope: "sin(57).scope({ tri: tri(60) }).gain(0.2).out()",
	shape: "sin(57).shape(lfo(0.5, 0, 1)).gain(0.2).out()",
	slew: `${NOTES}sin(s.slew(lfo(0.5, 0.001, 0.05), 0.02)).gain(0.2).out()`,
	spread: `${NOTES}s.add(p\`[-0.12, 0, 0.12]\`).saw().mul(0.1).spread(lfo(0.5, 0, 1)).out()`,
	sub: "sin(57).sub(lfo(2, 0, 0.5)).gain(0.2).out()",
	lpf: "saw(45).lpf({ cutoff: lfo(0.5, 60, 100), res: lfo(0.3, 0, 0.8) }).gain(0.2).out()",
	hpf: "saw(45).hpf({ cutoff: lfo(0.5, 60, 100), res: lfo(0.3, 0, 0.8) }).gain(0.2).out()",
	bpf: "saw(45).bpf({ cutoff: lfo(0.5, 60, 100), res: lfo(0.3, 0, 0.8) }).gain(0.2).out()",
	notch: "saw(45).notch({ cutoff: lfo(0.5, 60, 100), res: lfo(0.3, 0, 0.8) }).gain(0.2).out()",
	tape: `${NOTES}s.tri()
  .mul(s.gate.ad(0.005, 0.1))
  .tape({ time: 0.25, feedback: 0.6, mix: 0.5, drive: 0.5, wow: 0.5, flutter: 0.5, tone: 0.7 })
  .gain(0.2)
  .out()`,
	clock: `const c = clock(lfo(0.5, 100, 160))
sin(c.mul(12).wrap(12).add(57)).mul(c.beat.ad(0.005, 0.05)).mul(c.bar.ar(0.01, 0.2).add(0.5)).gain(0.2).out()`,
	clockdiv: `const c = tempo(120)
sin(60).mul(clockdiv(c.beat, 3).ad(0.005, 0.1)).gain(0.2).out()`,
	clockmult: `const c = tempo(120)
sin(60).mul(clockmult(c.beat, 3).ad(0.005, 0.05)).gain(0.2).out()`,
	counter: `const c = tempo(120)
sin(counter(c.beat, { reset: clockdiv(c.beat, 5) }).seq(p\`c4 e4 g4 ~\`.steps())).gain(0.2).out()`,
	mixer: `mixer({ a: sin(60), b: tri(67) }).level({ b: 0.5 }).mod("level.a", lfo(0.3), 0.5).gain(0.2).out()`,
	mux: `tempo(120)
sin(p\`\${lfo(0.3, 60, 72)} 67 <64 \${tri(0.5).add(60)}>\`).gain(0.2).out()`,
	seq: `${NOTES}s.saw().lpf(s.add(24), 0.3).mul(s.gate.adsr(0.01, 0.1, 0.5, 0.1)).gain(0.2).out()`,
	hz2semis: "sin(lfo(0.5, 200, 800).hz2semis()).gain(0.2).out()",
	semis2hz: "sin(hz(lfo(0.5, 50, 70).semis2hz())).gain(0.2).out()",
	beats2secs: `tempo(120)
sin(hz(lfo(0.5, 0.5, 2).beats2secs().mul(400))).gain(0.2).out()`,
	secs2beats: `tempo(120)
sin(hz(lfo(0.5, 0.25, 1).secs2beats().mul(200))).gain(0.2).out()`,
	wrap: "sin(lfo(0.5, 0, 40).wrap(12).add(57)).gain(0.2).out()",
	z1: "sin(57).z1().gain(0.2).out()",
};

describe("WASM registry sweep", () => {
	it("has a patch for every registered module", () => {
		expect(Object.keys(PATCHES).sort()).toEqual([...getRegistry().keys()].sort());
	});

	for (const [name, code] of Object.entries(PATCHES)) {
		it(`${name}: bit-identical to the interpreter over ${SECONDS} s`, () => {
			const program = evalPatch(code);
			expect(program.nodes.some((n) => n.module === name)).toBe(true);
			const result = compareBlocks(program, SECONDS);
			expect(result.difference).toBeNull();
			expect(result.peak).toBeGreaterThan(0);
		});
	}
});
