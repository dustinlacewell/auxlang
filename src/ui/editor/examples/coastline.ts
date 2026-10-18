import type { Example } from "@/ui/editor/examples/example";

/** (h) A port: eddyflux's strudel piece "coastline", now with the real vocabulary. */
const coastline = `tempo(180)

// chords
const chords = chord("<Bbm9 Fm9>/4")

const bandMask = slew({ in: p\`<[0 1] 1 1 1>\`.slow(16).early(0.5), rise: 0.02, fall: 0.02 })
const rideMask = slew({ in: p\`<0 0 1 1>\`.slow(16), rise: 0.02, fall: 0.02 })
const melodyMask = slew({ in: p\`<0 1 1 0>\`.slow(16), rise: 0.02, fall: 0.02 })

// kick
const kickSeq = seq(p\`<[[60 60] [~@3 60]] 60>\`)
kickSeq.trig.kick({ pitch: 43.65, sweep: 4, decay: 0.35, click: 0.02 })
  .mul(0.85)
  .mul(bandMask)
  .out()

// snare
const back = seq(p\`~ 60\`)
back.trig.snare({ pitch: 210, tone: 0.4, decay: 0.13, snappy: 0.8 })
  .reverb({ room: 0.4, damp: 0.5, mix: p\`<0 0.2>\` })
  .mul(1.5)
  .mul(bandMask)
  .out()

// hats
const hats = seq(p\`[60 <62 65>]*2\`.chunk(4, (q) => q.fast(2)))
hats.trig.hihat({ decay: 0.04, tone: 0.6, metal: 0.6 })
  .mul(1.6)
  .mul(bandMask)
  .pan(-0.2)
  .out()

// ride
const ride = seq(p\`60*2\`)
ride.trig.hihat({ decay: 0.18, tone: 0.45, metal: 0.85 })
  .mul(0.8)
  .mul(rideMask)
  .pan(0.3)
  .out()

// epiano
const epiano = seq(chords.offset(-1).voicing())
epiano.tri()
  .mul(epiano.gate.adsr(0.05, 0.4, 0.7, 0.5))
  .phaser({ rate: 0.25, depth: 0.7, mix: 0.4 })
  .reverb({ room: 0.5, damp: 0.5, mix: 0.28 })
  .mul(0.26)
  .spread()
  .out()

// bass
const bassLine = chords.mode("root:g2").n(p\`<0!3 1*2>\`)
const bass = seq(bassLine)
bass.tri()
  .lpf({ cutoff: 66, res: 0.1 })
  .mul(bass.gate.adsr(0.01, 0.3, 0.5, 0.15))
  .mul(0.5)
  .out()

// melody
const arp = chords.anchor("D5").n(
  p\`[0 <4 3 <2 5>>*2]\`
    .euclid(4, 8)
    .segment(4)
    .clip(0.6)
    .rarely((q) => q.ply(2))
    .chunk(4, (q) => q.fast(2)),
)
const mel = seq(arp)
mel.fm({ index: lfo(0.06, 0.4, 1.6), ratio: 1 })
  .lpf({ cutoff: lfo(0.06, 66, 80), res: 0.12 })
  .mul(mel.gate.adsr(0.02, 0.25, 0, 0.16))
  .shape(0.1)
  .delay({ time: 0.25, feedback: 0.3, mix: 0.25 })
  .reverb({ room: 0.8, damp: 0.55, mix: 0.4 })
  .mul(slew({ in: perlin.range(0.6, 0.9), rise: 0.05, fall: 0.05 }))
  .mul(melodyMask)
  .mul(0.4)
  .pan(0.15)
  .out()
`;

export const coastlineExample: Example = { name: "coastline (after eddyflux)", source: coastline };
