/**
 * The WASM spike's patch: oscillators (saw, tri, a sine lfo), filters with a
 * fixed, an lfo-swept and an envelope-swept cutoff, envelopes, seq on the
 * ambient clock, and out. The swept cutoffs keep auxlang's own pow and tan
 * on the per-sample path.
 */
export const WASM_SPIKE_PATCH = `tempo(120)
const pad = seq(p\`[c3,e3,g3] <[a2,c3,e3] [f2,a2,c3]>\`.slow(2))
pad.saw()
  .lpf({ cutoff: 84, res: 0.2 })
  .mod("cutoff", lfo(0.3), 12)
  .mul(pad.gate.adsr(0.3, 0.2, 0.7, 0.8))
  .gain(0.2)
  .out()
const bass = seq(p\`c2 [c2 eb2] g1 <bb1 c2>\`)
bass.tri()
  .lpf({ cutoff: bass.gate.adsr(0.001, 0.12, 0, 0).mul(48).add(40), res: 0.7 })
  .mul(bass.gate.adsr(0.005, 0.1, 0.6, 0.1))
  .gain(0.3)
  .out()`;
