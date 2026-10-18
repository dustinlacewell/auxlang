import type { Example } from "@/ui/editor/examples/example";

/** Irving Berlin's "Puttin' on the Ritz" as 90s eurodance. */
const puttinOnTheRitz = `// Irving Berlin's "Puttin' on the Ritz" as 90s eurodance
tempo(128)

// tune
const VERSE = [
  "g4 a4 c5 a4", "c5 b4@2 d5@5", "g4 a4 c5 a4", "c5 b4@2 d5@5",
  "bb4 c5 eb5 c5", "eb5 d5@2 f5@5", "bb4 c5 eb5 c5", "eb5 d5@2 f5@5",
  "g5@4 d5@3 b4", "d5@2 c5@2 b4 a4@3", "g5@4 d5@3 b4", "d5@2 c5@2 b4 a4@3",
  "e5 e5 b4 b4", "e5", "f#5@2 f#5@2 f#5 e5 d5@2", "g5",
]
const A = [
  "c5@2 eb5@2 g5@2 g4 c5", "~ eb5 g5@2 g4@2 c5@2", "eb5@2 g5@2 g4 c5@2 eb5", "g5@2 g4@2 b4@2 d5@2",
  "f5", "~@4 g5 f5 eb5 d5", "c5", "~",
]
const B = [
  "f5@2 g5@2 ab5@2 bb5@2", "c6@2 bb5@2 ab5@2 g5@2", "f5@2 ~ f5@5", "g5 f#5@2 f5@2 bb5@3",
  "eb5@2 f5@2 g5@2 ab5@2", "bb5@2 ab5@2 g5@2 f5@2", "eb5@2 ~ eb5@5", "eb5 eb5@2 eb5@2 d5@3",
]
// swung bridge
const B_SWUNG = [
  "f5 g5 ab5 bb5", "c6 bb5 ab5 g5", "f5@3 ~@2 f5@7", "g5@2 f#5@3 f5@3 bb5@4",
  "eb5 f5 g5 ab5", "bb5 ab5 g5 f5", "eb5@3 ~@2 eb5@7", "eb5@2 eb5@3 eb5@3 d5@4",
]
const TAG = "~@4 g5 f5 eb5 d5"
// descant
const COUNTER = ["c6", "bb5", "g5", "g5@2 f5@2", "a5", "b5@4 ~@4", "c6@2 bb5@2", "ab5@2 g5@2"]
const WALK = [
  "f2 g2 ab2 b2", "c3 g2 c#3 c3", "f2 ab2 c3 a2", "g2 f#2 f2 bb2",
  "eb2 g2 bb2 a2", "bb2 ab2 f2 d2", "eb2 f2 g2 a2", "ab2 c3 g2 b2",
]

// chords
const VERSE_H = [
  ["C", "Ebo7"], ["Dm7", "G7"], ["C", "Ebo7"], ["Dm7", "G7"],
  ["Eb", "F#o7"], ["Fm7", "Bb7"], ["Eb", "F#o7"], ["Fm7", "Bb7"],
  ["G", "G#o7"], ["Am7", "D7"], ["G", "G#o7"], ["Am7", "D7"],
  ["Em"], ["A7"], ["D7"], ["G7"],
]
const A_H = [["Cm"], ["Cm"], ["Cm"], ["Cm", "G7"], ["Dm7"], ["G7"], ["Cm", "Cm/Bb"], ["Ab7", "G7"]]
const B_H = [["Fm"], ["C7@2", "C#7", "C7"], ["Fm"], ["Gm", "F#m", "F", "Bb7"], ["Eb"], ["Bb7"], ["Eb"], ["Ab", "G"]]
const INTRO_H = [["Ab7", "G7"], ["Cm"], ["Ab7", "G7"], ["Cm"], ["Ab7", "G7"], ["Cm"], ["Ab7", "G7"], ["Cm"]]
const BUILD_H = [["Cm"], ["Cm"], ["Cm/Bb"], ["Cm/Bb"], ["Cm"], ["Cm"], ["G7"], ["G7"]]
const OUTRO_H = [["Ab7", "G7"], ["Cm"], ["Ab7", "G7"], ["Cm"], ["Ab7", "G7"], ["Cm", "Fm"], ["C"], ["C"]]
const V = {
  C: ["c3", "e3", "g3"], Cm: ["c3", "eb3", "g3"], "Cm/Bb": ["bb2", "eb3", "g3"], C7: ["e3", "g3", "bb3", "c4"],
  "C#7": ["f3", "g#3", "b3", "c#4"], Dm7: ["d3", "f3", "a3", "c4"], D7: ["d3", "f#3", "a3", "c4"],
  Ebo7: ["eb3", "gb3", "a3", "c4"], Eb: ["eb3", "g3", "bb3"], Em: ["e3", "g3", "b3"],
  F: ["f3", "a3", "c4"], Fm: ["f3", "ab3", "c4"], Fm7: ["f3", "ab3", "c4", "eb4"], "F#m": ["f#3", "a3", "c#4"],
  "F#o7": ["f#3", "a3", "c4", "eb4"], G: ["b2", "d3", "g3"], G7: ["b2", "d3", "f3", "g3"],
  Gm: ["g3", "bb3", "d4"], "G#o7": ["g#3", "b3", "d4", "f4"], Ab: ["ab2", "c3", "eb3"],
  Ab7: ["ab2", "c3", "eb3", "gb3"], A7: ["a2", "c#3", "e3", "g3"], Am7: ["a2", "c3", "e3", "g3"],
  Bb7: ["d3", "f3", "ab3", "bb3"],
}

// form
const SONG = [
  ["intro", INTRO_H], ["verse", VERSE_H],
  ["a1", A_H], ["a2", A_H], ["b", B_H], ["a3", A_H],
  ["swing", B_H], ["build", BUILD_H],
  ["a1x", A_H], ["a2x", A_H], ["bx", B_H], ["a3x", A_H],
  ["outro", OUTRO_H],
]
// a part is a bar string, or a function of the chords and bar that returns one
const track = (parts, idle = "~") => {
  const write = (part, chords, i) => (typeof part === "function" ? part(chords, i) : part ?? idle)
  const bars = SONG.flatMap(([name, harmony]) => harmony.map((chords, i) => write(parts[name], chords, i)))
  return seq(p\`\${bars}\`.slow(bars.length))
}
const chorus = (fn) => ({ a1: fn, a2: fn, a3: fn, a1x: fn, a2x: fn, a3x: fn })

// bar writers
const chordAt = (chords, t) => {
  const parts = chords.map((c) => c.split("@")).map(([name, w]) => [name, Number(w ?? 1)])
  let x = t * parts.reduce((sum, [, w]) => sum + w, 0)
  for (const [name, w] of parts) {
    if (x < w) return name
    x -= w
  }
}
const shift = (note, octaves) => note.replace(/[0-9]$/, (o) => Number(o) + octaves)
const octave = (bar, by) => bar.replace(/([a-g][#b]?)([0-9])/g, (_, n, o) => n + (Number(o) + by))
const down = (bar) => octave(bar, -1)
const root = (name) => (name.includes("/") ? name.split("/")[1] : name.match(/^[A-G][#b]?/)[0]).toLowerCase()
const rhythm = (slots, voice) => (chords) =>
  slots.split(" ").map((s, i, all) => (s === "~" ? "~" : voice(chordAt(chords, i / all.length), s, i))).join(" ")
const bracket = (notes) => "[" + notes + "]"
const held = (chords) => chords.map((c) => c.split("@")).map(([n, w]) => bracket(V[n]) + "@" + (w ?? 1)).join(" ")
const stack = (name) => bracket(V[name].map((n) => shift(n, 1)))
const bassNote = (name, s) => root(name) + (s === "o" ? 3 : 2)
const arpNote = (name, s, i) => shift(V[name][i % 3], 1)
const ramp = (from, to) => Array.from({ length: 16 }, (_, k) => (from + ((to - from) * k) / 16).toFixed(2)).join(" ")

const OFF = rhythm("~ x ~ x ~ x ~ x", bassNote)
const OCT = rhythm("~ x ~ o ~ x ~ o", bassNote)
const PUMP = rhythm("x o x o x o x o", bassNote)
const GAP = (chords, i) => i < 4 ? "~" : rhythm(i === 5 ? "x ~ ~ x ~ ~ ~ ~" : "~ ~ ~ x ~ ~ x ~", stack)(chords)
const HIT332 = rhythm("x ~ ~ x ~ ~ x ~", stack)
const ARP = rhythm("x x x x x x x x x x x x x x x x", arpNote)
const FOUR = "60 60 60 60"
const BACK = "~ 60 ~ 60"
const OPEN = "[~ 60]*4"

// key change
const key = seq(p\`<0!71 1!41>\`)

// drums
const kicks = track({
  intro: (c, i) => (i < 4 ? "~" : i === 7 ? "60 60 60 [60 60]" : FOUR),
  verse: (c, i) => (i === 15 ? "60 60 ~ ~" : FOUR),
  ...chorus(FOUR),
  a3: (c, i) => (i < 2 ? "~" : i === 7 ? "60 60 ~ ~" : FOUR),
  b: FOUR, bx: FOUR,
  build: (c, i) => (i < 2 ? "~" : i < 4 ? "60 ~ 60 ~" : i === 7 ? "60 60 ~ ~" : FOUR),
  outro: (c, i) => (i < 4 ? FOUR : "~"),
})
kicks.trig.kick({ pitch: 48, sweep: 4, decay: 0.28, click: 0.2 }).gain(0.6).out()
const duck = kicks.trig.ad(0.002, 0.22).mul(-0.7).add(1)

const claps = track({
  verse: (c, i) => (i >= 8 ? BACK : "~"),
  ...chorus(BACK),
  a3: (c, i) => (i >= 2 && i < 7 ? BACK : "~"),
  b: (c, i) => (i === 7 ? "~ 60 ~ [60 60]" : BACK),
  bx: (c, i) => (i === 7 ? "~ 60 [~ 60] [60 60]" : BACK),
  outro: (c, i) => (i < 4 ? BACK : "~"),
})
const clapOut = claps.trig.clap({ decay: 0.18, tone: 0.55 }).gain(0.6)
clapOut.out()

const snares = track({
  intro: (c, i) => (i === 7 ? "~ ~ ~ 60*4" : "~"),
  verse: (c, i) => (i === 14 ? "~ ~ ~ [60 60]" : i === 15 ? "60 60 60*4 ~" : "~"),
  a3: (c, i) => (i === 1 ? "~ ~ 60*4 60*4" : "~"),
  build: (c, i) => (i === 4 ? FOUR : i === 5 ? "60*8" : i === 6 ? "60*16" : i === 7 ? "60*4 60*4 60*4 ~" : "~"),
  b: (c, i) => (i === 7 ? "~ ~ ~ 60*4" : "~"),
  bx: (c, i) => (i === 7 ? "~ ~ 60*4 60*4" : "~"),
})
snares.trig.snare({ tone: 0.5, snappy: 0.8, decay: 0.12 }).gain(0.45).out()

const openHats = track({
  intro: (c, i) => (i >= 4 ? OPEN : "~"),
  verse: OPEN, ...chorus(OPEN), b: OPEN, bx: OPEN,
  a3: (c, i) => (i >= 2 && i < 7 ? OPEN : "~"),
  build: (c, i) => (i >= 4 && i < 7 ? OPEN : "~"),
  outro: (c, i) => (i < 6 ? OPEN : "~"),
})
openHats.trig.hihat({ decay: 0.09, tone: 0.75, metal: 0.6 }).gain(1.1).pan(0.2).out()

const ticks = track({
  verse: (c, i) => (i >= 8 ? "60*16" : "~"),
  a2: "60*16", b: "60*16", a1x: "60*16", a2x: "60*16", bx: "60*16", a3x: "60*16",
})
ticks.trig.hihat({ decay: 0.02, tone: 0.9, metal: 0.4 }).gain(0.8).pan(-0.25).out()

// swing break
const brush = track({ swing: () => "60 [60@2 60] 60 [60@2 60]" })
brush.trig.hihat({ decay: 0.14, tone: 0.35, metal: 0.8 }).gain(0.9).pan(0.15).out()

const walk = track({ swing: (c, i) => WALK[i] })
walk.add(key).tri()
  .lpf(72)
  .mul(walk.gate.adsr(0.005, 0.25, 0.35, 0.08))
  .gain(0.55)
  .out()

const comp = track({ swing: rhythm("~ x ~ x", (name) => bracket(V[name])) })
comp.add(key).fm({ index: 1.2, ratio: 1 })
  .mul(comp.gate.adsr(0.002, 0.25, 0.15, 0.1))
  .gain(0.07)
  .spread(0.5)
  .out()

const clarinet = track({ swing: (c, i) => B_SWUNG[i] })
clarinet.add(key).sqr()
  .lpf({ cutoff: 80, res: 0.1 })
  .mul(clarinet.gate.adsr(0.03, 0.2, 0.7, 0.12))
  .tape({ time: 0.35, feedback: 0.25, mix: 0.2, wow: 0.7, flutter: 0.5, tone: 0.4 })
  .gain(0.2)
  .out()

// bass
const bass = track({
  intro: (c, i) => (i >= 4 ? OFF(c) : "~"),
  verse: (c, i) => (i < 8 ? OFF(c) : OCT(c)),
  ...chorus(OCT),
  a3: (c, i) => (i < 2 ? "~" : i === 7 ? rhythm("~ x ~ o ~ ~ ~ ~", bassNote)(c) : OCT(c)),
  a2x: PUMP,
  b: PUMP, bx: PUMP,
  build: (c, i) => (i < 2 ? "~" : i < 4 ? rhythm("x ~ ~ ~ x ~ ~ ~", bassNote)(c) : i === 7 ? rhythm("x x x x ~ ~ ~ ~", bassNote)(c) : OFF(c)),
  outro: (c, i) => (i < 4 ? OFF(c) : i === 6 ? bassNote("C", "x") : "~"),
})
bass.add(key).saw()
  .lpf({ cutoff: 64, res: 0.25 })
  .mod("cutoff", bass.gate.ad(0.003, 0.12), 24)
  .mul(bass.gate.adsr(0.003, 0.1, 0.6, 0.04))
  .gain(0.26)
  .out()

// harmony
const supersaw = (pitch) => saw(pitch).add(saw(pitch.add(0.12))).add(saw(pitch.add(-0.12)))

const pad = track({
  intro: held, verse: held, ...chorus(held), b: held, bx: held, build: held,
  outro: (c, i) => (i < 6 ? held(c) : i === 6 ? bracket(V.C) : "~"),
})
const padCut = track({
  intro: (c, i) => ramp(64 + i * 2, 66 + i * 2),
  verse: () => "76", ...chorus(() => "80"), b: () => "92", bx: () => "92",
  build: (c, i) => ramp(66 + i * 3, 69 + i * 3),
  outro: (c, i) => ramp(80 - i * 2, 78 - i * 2),
}, "76")
supersaw(pad.add(key))
  .lpf({ cutoff: padCut, res: 0.1 })
  .mul(pad.gate.adsr(0.3, 0.5, 0.8, 0.6))
  .mul(duck)
  .gain(0.035)
  .spread(0.7)
  .out()

const stabs = track({
  ...chorus(GAP), b: HIT332, a2x: HIT332, bx: HIT332,
  verse: (c, i) => (i >= 12 ? HIT332(c) : "~"),
  build: (c, i) => (i >= 6 ? HIT332(c) : "~"),
  outro: (c, i) => (i === 6 ? stack("C") + " ~ ~ ~" : "~"),
})
const stab = supersaw(stabs.add(key))
  .lpf({ cutoff: 82, res: 0.2 })
  .mod("cutoff", stabs.gate.ad(0.003, 0.15), 18)
  .mul(stabs.gate.adsr(0.003, 0.18, 0.15, 0.12))
  .gain(0.04)
stab.spread().out()

const arps = track({
  intro: (c, i) => (i >= 4 ? ARP(c) : "~"),
  verse: (c, i) => (i >= 12 ? ARP(c) : "~"),
  a2: ARP, a3: (c, i) => (i >= 2 ? ARP(c) : "~"),
  build: (c, i) => (i >= 2 ? ARP(c) : "~"),
  a1x: ARP, a2x: ARP, bx: ARP, a3x: ARP,
  outro: (c, i) => (i < 4 ? ARP(c) : "~"),
})
const arpCut = track({
  intro: (c, i) => (i < 4 ? "70" : ramp(70 + (i - 4) * 5, 75 + (i - 4) * 5)),
  ...chorus(() => "92"), bx: () => "92",
  build: (c, i) => ramp(70 + i * 3, 73 + i * 3),
  outro: (c, i) => ramp(92 - i * 3, 89 - i * 3),
}, "86")
arps.add(key).sqr()
  .lpf({ cutoff: arpCut, res: 0.35 })
  .mul(arps.gate.ad(0.002, 0.09))
  .delay({ time: beats(0.75), feedback: 0.35, mix: 0.25 })
  .gain(0.1)
  .pan(lfo(0.1, -0.5, 0.5))
  .out()

// melody
const leadVoice = (notes) => {
  const pitch = notes.add(key)
  return sqr(pitch.add(0.07)).add(sqr(pitch.add(-0.07)))
    .lpf({ cutoff: 86, res: 0.2 })
    .mod("cutoff", notes.gate.ad(0.005, 0.25), 14)
    .mul(notes.gate.adsr(0.005, 0.2, 0.6, 0.1))
    .delay({ time: beats(0.75), feedback: 0.3, mix: 0.2 })
    .gain(0.09)
}
const lead = track({
  ...chorus((c, i) => A[i]), b: (c, i) => B[i], bx: (c, i) => B[i],
  a3x: (c, i) => octave(A[i], 1),
  build: (c, i) => (i < 6 ? A[0] : i === 6 ? A[3] : "g4 b4 d5 f5"),
})
const leadLow = track({ a2x: (c, i) => down(A[i]), a3x: (c, i) => A[i] })
const leadOut = leadVoice(lead)
leadOut.out()
leadVoice(leadLow).gain(0.7).out()

const verse = track({ verse: (c, i) => VERSE[i] })
const ep = verse.add(key).fm({ ratio: 2, index: 0.4 })
  .mod("index", verse.gate.ad(0.002, 0.4), 3)
  .mul(verse.gate.adsr(0.003, 0.5, 0.3, 0.25))
  .delay({ time: beats(0.75), feedback: 0.35, mix: 0.3 })
  .gain(0.22)
ep.out()

const tag = track({
  intro: (c, i) => (i % 2 === 0 ? TAG : "c5"),
  a1: (c, i) => (i === 7 ? down(TAG) : "~"),
  a1x: (c, i) => (i === 7 ? down(TAG) : "~"),
  // the last tag ends in C major
  outro: (c, i) => [TAG, "c5", TAG, "c5", TAG, "~", "~@4 g5 f5 e5 d5", "c5"][i],
})
tag.add(key).tri()
  .mul(tag.gate.adsr(0.01, 0.2, 0.5, 0.15))
  .tape({ time: beats(0.75), feedback: 0.55, mix: 0.4, wow: 0.3, flutter: 0.2, tone: 0.5 })
  .gain(0.3)
  .out()

const descant = track({ a1x: (c, i) => COUNTER[i] })
descant.add(key).tri()
  .mod("pitch", lfo(5), 0.12)
  .mul(descant.gate.adsr(0.15, 0.3, 0.8, 0.4))
  .gain(0.16)
  .out()

// reverb
mixer({ stab: stab.mix(), lead: leadOut.mix(), ep, clap: clapOut })
  .level({ stab: 0.6, clap: 0.5 })
  .reverb({ room: 0.75, damp: 0.5, mix: 1 })
  .gain(0.24)
  .out()
`;

export const puttinOnTheRitzExample: Example = {
	name: "puttin' on the ritz",
	source: puttinOnTheRitz,
};
