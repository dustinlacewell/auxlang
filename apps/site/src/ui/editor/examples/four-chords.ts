import type { Example } from "@/ui/editor/examples/example";

/** A short house loop whose arpeggio changes every bar. */
const fourChords = `tempo(120)

// one chord per bar
const chords = chord("<Am9 Fmaj9 Cmaj9 G6>")

// drums: the kick drops out at the end of every 8 bars
seq("<60*4!7 [60 ~ ~ ~]>").trig.kick().gain(0.8).out()
seq(p\`~ <60*4 60*8>\`.degrade(0.5)).trig.snare().gain(0.4).delay().out()
seq("[~ 60]*4").trig.hihat({ decay: 0.05 }).gain(0.4).out()

// bass
seq(chords.mode("root:a1").n("[~ 0]*4"))
  .apply((s) => s.tri().mul(s.gate.adsr(0.005, 0.1, 0.6, 0.05)))
  .gain(0.5)
  .out()

// pad
seq(chords.voicing())
  .apply((s) => s.tri().mul(s.gate.adsr(0.4, 0.3, 0.6, 0.8)))
  .gain(0.08)
  .spread()
  .out()

// arp: random gaps each bar, lifted every 4th bar
seq(chords.anchor("e5")
  .n(p\`0 2 4 <1 3> <5 7> 4 2 <3 6>\`.degrade(0.3).every(4, (q) => q.add(2))))
  .apply((s) => s.tri().mul(s.gate.ad(0.005, 0.2)))
  .lpf(lfo(0.05, 72, 100), 0.3)
  .delay({ time: beats(0.75), feedback: 0.5, mix: 0.35 })
  .gain(0.25)
  .pan(lfo(0.1, -0.5, 0.5))
  .out()
`;

export const fourChordsExample: Example = { name: "four chords", source: fourChords };
