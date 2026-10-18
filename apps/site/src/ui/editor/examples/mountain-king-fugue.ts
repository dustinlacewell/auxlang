import type { Example } from "@/ui/editor/examples/example";

/** (j) Grieg's "Hall of the Mountain King": a fugue that speeds itself into a club drop, then winds down. */
const mountainKingFugue = `// clock: its tempo is patched from its own position
const span = (s, lo, hi) => s.lt(hi).add(s.lt(lo).mul(-1))
const clk = loop((pos) => {
  const x = pos.div(24).clip(0, 1)
  const accel = x.mul(x).mul(156).add(100)
  const windDown = pos.add(-62).mul(-98).add(128)
  return clock(accel.mul(pos.lt(24))
    .add(span(pos, 24, 62).mul(128))
    .add(span(pos, 62, 63).mul(windDown))
    .add(span(pos, 63, 64).mul(128)))
})
const ramp = (lo, hi) => clk.add(-lo).div(hi - lo).clip(0, 1).mul(span(clk, lo, hi))
const swell = clk.div(24).clip(0, 1).mul(0.6).add(0.4)
const dive = ramp(62, 63).mul(-12)

// subject and countersubject
const theme = [
  p\`b3 c#4 d4 e4 f#4 d4 f#4@2\`,
  p\`f4 c#4 f4@2 e4 c4 e4@2\`,
  p\`b3 c#4 d4 e4 f#4 d4 f#4 b4\`,
  p\`a4 f#4 d4 f#4 a4@4\`,
]
const countersubject = [
  p\`b2 ~ f#3 ~ b2 ~ f#3 ~\`,
  p\`c#3 ~ g#3 ~ c3 ~ g3 ~\`,
  p\`b2 ~ f#3 ~ b2 ~ f#3 ~\`,
  p\`d3 ~ a3 ~ d3 ~ a3 ~\`,
]
const up = (bars, n) => bars.map((bar) => bar.add(n))
const times = (n, bar) => Array(n).fill(bar)
const rest = (n) => times(n, p\`~\`)
const part = (...blocks) => {
  const bars = blocks.flat(Infinity)
  return seq(p\`\${bars}\`.slow(bars.length), clk)
}
const drum = (...blocks) => part(...blocks).trig

// drop material: the theme in 16ths, its harmony, and the drums
const dropTheme = up([p\`\${theme[0]} \${theme[1]}\`, p\`\${theme[2]} \${theme[3]}\`], 12)
const roots = [p\`~ b1 ~ b1 ~ c#2 ~ c2\`, p\`~ b1 ~ b1 ~ d2 ~ d2\`]
const chords = [
  p\`[b3,d4,f#4]@2 [c#4,f4,g#4] [c4,e4,g4]\`,
  p\`[b3,d4,f#4]@2 [d4,f#4,a4]@2\`,
]
const stabs = [
  p\`[b3,d4,f#4] ~ ~ [b3,d4,f#4] [c#4,f4,g#4] ~ [c4,e4,g4] ~\`,
  p\`[b3,d4,f#4] ~ ~ [b3,d4,f#4] [d4,f#4,a4] ~ [d4,f#4,a4] ~\`,
]
const arps = [
  p\`[b4 d5 f#5 d5]!2 [c#5 f5 g#5 f5] [c5 e5 g5 e5]\`,
  p\`[b4 d5 f#5 d5]!2 [d5 f#5 a5 f#5]!2\`,
]
const march = p\`60 ~ ~ ~ 60 ~ ~ ~\`
const backbeat = p\`~ ~ 60 ~ ~ ~ 60 ~\`
const floor = p\`60 60 60 60\`
const offbeat = p\`~ 60 ~ 60 ~ 60 ~ 60\`
const fill = p\`~ ~ 60 ~ [60 60] [60 60] [60*4] [60*4]\`
const landing = p\`~ ~ 60 ~ ~ ~ ~ ~\`

// fugue voices: exposition, stretto, tutti; alto and cello return in the last drop
const alto = part(
  theme, up(countersubject, 7), rest(4), theme, theme, theme.slice(0, 3), rest(1),
  rest(28), theme, theme,
  up(dropTheme, -12), up(dropTheme, -12)[0], p\`~ ~ d4 _ _ _ _ ~\`, rest(1))
const soprano = part(
  rest(4), up(theme, 19), up(countersubject, 24), rest(2), up(theme.slice(0, 2), 12), up(theme, 12),
  up(theme, 12), rest(41))
const cello = part(
  rest(8), up(theme, -12), countersubject, up(theme, -12), up(theme, -12).slice(0, 3),
  rest(29), countersubject, countersubject, rest(5))
const tenor = part(rest(16), up(countersubject, 12), up(countersubject, 12).slice(0, 3), rest(42))

// drop voices: drop 1, drop 2, breakdown, drop 3 in F#, drop 4, unison, wind-down, landing
const lead = part(
  rest(24), times(8, dropTheme), rest(4), times(4, up(dropTheme, 7)), times(4, dropTheme),
  dropTheme, dropTheme[0], p\`~ ~ b4 _ _ _ _ ~\`, rest(1))
const bassline = part(
  rest(24), times(8, roots), rest(4), times(4, up(roots, 7)), times(4, roots),
  up(dropTheme, -36), up(dropTheme, -36)[0], p\`~ ~ b1 _ _ _ _ ~\`, rest(1))
const pads = part(
  rest(24), times(8, chords), times(4, p\`[b2,f#3,b3]\`), times(4, up(chords, 7)), times(4, chords),
  rest(3), p\`~ ~ [b3,d4,f#4] _ _ _ _ ~\`, rest(1))
const horns = part(
  rest(32), times(4, stabs), theme, times(4, up(stabs, 7)), times(4, stabs),
  rest(3), p\`~ ~ [f#3,b3,d4] _ _ _ _ ~\`, rest(1))
const bells = part(
  rest(32), times(4, arps), rest(4), times(4, up(arps, 7)),
  rest(1), times(3, up(dropTheme, 12)), up(dropTheme, 12)[0],
  up(dropTheme, 12), up(dropTheme, 12)[0], p\`~ ~ b5 _ _ _ _ ~\`, rest(1))

// drums
const kickTrig = drum(rest(24), times(16, floor), rest(4), times(19, floor), landing, rest(1))
const impacts = drum(
  rest(24), p\`60\`, rest(7), p\`60\`, rest(11), p\`60\`, rest(7), p\`60\`, rest(7), p\`60\`, rest(2), landing, rest(1))
const pump = kickTrig.ad(0.002, 0.25).mul(-0.75).add(1)

drum(rest(8), times(8, march), times(6, p\`60 ~ 60 ~ 60 ~ 60 ~\`), rest(43))
  .kick({ pitch: 40, sweep: 3, decay: 0.3, click: 0.05 })
  .mul(swell)
  .gain(0.35)
  .out()

kickTrig
  .kick({ pitch: 45, sweep: 4, decay: 0.35, click: 0.3 })
  .gain(0.8)
  .out()

drum(
  rest(12), times(8, backbeat), times(2, p\`60*8\`), p\`60*16\`, p\`[60*8] [60*8] ~ ~\`,
  rest(7), fill, rest(7), fill, rest(2), p\`60*8\`, p\`60*16\`,
  rest(7), fill, rest(7), fill, p\`60*8\`, p\`60*16\`, rest(1), landing, rest(1))
  .snare()
  .mul(swell)
  .gain(0.22)
  .out()

drum(rest(28), times(12, p\`~ 60 ~ 60\`), rest(4), times(18, p\`~ 60 ~ 60\`), rest(3))
  .clap()
  .gain(0.28)
  .out()

drum(rest(16), times(6, p\`60*8\`), rest(10), times(8, p\`60*16\`), rest(4), times(18, p\`60*16\`), rest(3))
  .hihat()
  .gain(0.05)
  .out()

drum(rest(24), times(16, offbeat), rest(4), times(18, offbeat), rest(3))
  .hihat({ decay: 0.15, tone: 0.7 })
  .gain(0.1)
  .out()

impacts
  .hihat({ decay: 1.5, tone: 0.8, metal: 0.7 })
  .gain(0.15)
  .out()

const boom = impacts.ad(0.001, 1.5)
sin(boom.mul(30).add(26))
  .mul(boom)
  .gain(0.35)
  .out()

// effects: risers into the drop and the breakdown's drop, a downlifter into the breakdown
const hiss = noise()
const rise = ramp(20, 24).add(ramp(42, 44))
hiss.hpf(rise.mul(48).add(72), 0.3)
  .mul(rise)
  .gain(0.2)
  .out()

const fall = ramp(40, 41).mul(-1).add(1).mul(span(clk, 40, 41))
hiss.lpf(fall.mul(60).add(50), 0.2)
  .mul(fall)
  .gain(0.25)
  .out()

// sound: each voice goes out dry and into one shared hall reverb
const voice = (s, wave, cutoff, level) => s.add(dive)[wave]()
  .lpf(cutoff, 0.2)
  .mod("cutoff", swell, 18)
  .mul(s.gate.adsr(0.005, 0.1, 0.4, 0.06))
  .mul(swell)
  .gain(level)
const halfInDrop = (level) => span(clk, 52, 64).mul(-level / 2).add(level)
const altoSig = voice(alto, "sqr", 75, halfInDrop(0.24))
const sopranoSig = voice(soprano, "tri", 89, 0.27)
const celloSig = voice(cello, "saw", 63, halfInDrop(0.3))
const tenorSig = voice(tenor, "saw", 70, 0.2)
altoSig.pan(-0.3).out()
sopranoSig.pan(0.3).out()
celloSig.out()
tenorSig.pan(-0.1).out()

const detune = seq(p\`[-0.15, -0.05, 0.05, 0.15]\`, clk)
const leadSig = lead.add(dive).add(detune).saw()
  .lpf(92, 0.15)
  .mul(lead.gate.adsr(0.003, 0.1, 0.6, 0.06))
  .gain(0.11)
leadSig.spread(0.8).out()

const padPitch = pads.add(dive)
const padSig = padPitch.saw()
  .add(padPitch.add(0.1).saw())
  .lpf(68, 0.1)
  .mod("cutoff", clk.wrap(8).div(8), 24)
  .mul(pads.gate.adsr(0.05, 0.3, 0.8, 0.3))
  .mul(pump)
  .gain(0.085)
padSig.spread(0.7).out()

const hornPitch = horns.add(dive)
const hornSig = hornPitch.saw()
  .add(hornPitch.add(-0.08).saw())
  .lpf(58, 0.15)
  .mod("cutoff", horns.gate.adsr(0.04, 0.25, 0.5, 0.1), 36)
  .mul(horns.gate.adsr(0.02, 0.2, 0.8, 0.12))
  .mul(pump)
  .gain(0.08)
hornSig.spread(0.5).out()

const bellSig = bells.add(dive)
  .fm(1.8, 3.5)
  .mul(bells.gate.ad(0.001, 0.5))
  .gain(0.08)
bellSig.delay({ time: 0.352, feedback: 0.35, mix: 0.3 })
  .pan(0.35)
  .out()

bassline.add(dive).saw()
  .lpf(50, 0.3)
  .mod("cutoff", bassline.gate.ad(0.002, 0.15), 30)
  .mul(bassline.gate.adsr(0.002, 0.1, 0.7, 0.05))
  .mul(pump)
  .gain(0.3)
  .out()

mixer({
    alto: altoSig,
    soprano: sopranoSig,
    cello: celloSig,
    tenor: tenorSig,
    lead: leadSig.mix(),
    pads: padSig.mix(),
    horns: hornSig.mix(),
    bells: bellSig})
  .reverb({ room: 0.88, damp: 0.4, mix: 1 })
  .gain(0.12)
  .out()
`;

export const mountainKingFugueExample: Example = {
	name: "mountain king (fugue into a drop)",
	source: mountainKingFugue,
};
