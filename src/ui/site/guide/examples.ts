/**
 * The guide's runnable patches, keyed by section. Kept apart from the prose so
 * the page component reads as structure. Every patch is the shipped idiom for
 * its section — the same shapes docs/user-guide.md teaches.
 */

export const GUIDE_EXAMPLES = {
	modules: "sin(440).out({ gain: 0.3 })",

	signals: `sin(sin(0.2, 200, 600))
  .gain(0.3)
  .out()`,

	routing: `saw(110)
  .lpf({ cutoff: sin(0.3, 300, 2000), res: 0.3 })
  .gain(0.3)
  .out()`,

	sequencing: `clock(120)
const s = seq("c3 e3 g3 e3")
s.tri()
  .lpf({ cutoff: 1400, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.08, 0.4, 0.1))
  .gain(0.3)
  .out()`,

	patterns: `clock(110)
const hook = p\`c3 [e3 g3] a3 ~\`
const line = seq(hook.rev().every(2, (q) => q.add(7)))
line.tri()
  .mul(line.gate.adsr(0.005, 0.1, 0.4, 0.15))
  .gain(0.3)
  .out()`,

	patternModulation: `clock(100)
const s = seq("c2 c2 c2 c2")
const cutoff = slew({ in: p\`400 800 [1600 300] <200 3200>\`, rise: 5e-6, fall: 5e-6 })
s.saw()
  .lpf({ cutoff, res: 0.5 })
  .mul(s.gate.adsr(0.005, 0.1, 0.6, 0.15))
  .gain(0.25)
  .out()`,

	drums: `clock(120)
seq(p\`60(3,8)\`).trig.kick().gain(0.9).out()
seq("~ 60 ~ 60").trig.snare().gain(0.7).out()
seq("60*8").trig.hihat({ decay: 0.04 }).gain(0.4).out()`,

	polyphony: `clock(90)
const pad = seq("{c3,e3,g3}")
pad.tri()
  .lpf({ cutoff: 1400, res: 0.2 })
  .mul(pad.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.25)
  .out()`,

	stereo: `clock(120)
const s = seq("c3 e3 g3 e3")
s.tri()
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .pan(sin(0.5, -1, 1))
  .apply((v) => out({ l: v.l, r: v.r }))`,

	feedback: `saw(110)
  .mul(sin(2).gt(0).mul(0.5))
  .apply((dry) => loop((fb) => dry.add(fb.delay({ time: 0.18, mix: 1 }).mul(0.6))))
  .gain(0.3)
  .out()`,

	customModules: `clock(120)
defmod({
  name: "wavefold",
  category: "effects",
  doc: "sine-shaper wavefolder",
  ins: { in: sig(0), amount: unit(0.5) },
  outs: { out: sig() },
  defaultIn: "in",
  defaultOut: "out",
  positional: ["amount"],
  tick: (s, i, o) => { o.out = Math.sin(i.in * (1 + i.amount * 6)) },
})
const n = seq("c2 e2 g2 c3")
n.pitch.saw().wavefold(0.7)
  .mul(n.gate.adsr(0.005, 0.15, 0.4, 0.2))
  .mul(0.25)
  .out()`,

	patstep: `clock(110)
const s = seq("c2(4,8)")
s.tri()
  .mul(s.gate.adsr(0.003, 0.06, 0.3, 0.06))
  .mul(patstep(p\`0.3 0.1 0.25 0.15\`, s.trig))
  .gain(0.9)
  .out()`,
} as const;
