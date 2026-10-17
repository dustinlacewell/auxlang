// scope - showcase
// A seq-driven voice scoped mid-chain, plus a second scope probing its envelope and an LFO
tempo(120)
const s = seq("c3 e3 g3 <b2 a2>")
s.tri()
  .scope()
  .lpf({ cutoff: 81, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()
scope({ env: s.gate.adsr(0.01, 0.1, 0.5, 0.2), lfo: lfo(0.5) })
