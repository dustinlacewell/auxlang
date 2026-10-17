/**
 * The module-dsp page's runnable patches, keyed by chapter. Each is a whole
 * patch: a defmod plus a short chain that plays it, ending in out().
 */

export const MODULE_DSP_EXAMPLES = {
	firstModule: `const fold = defmod("fold", { cat: "effects" }, () => {
  return ({ in: x = 0, amount = 0.5 }) => Math.sin(x * (1 + amount * 6))
})
tempo(110)
const s = seq("c3 e3 g3 e3")
s.tri()
  .fold(0.6)
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,

	firstModuleChained: `const fold = defmod("fold", { cat: "effects" }, () => {
  return ({ in: x = 0, amount = 0.5 }) => Math.sin(x * (1 + amount * 6))
})
tri(55).fold(0.8).lpf(90).gain(0.3).out()`,

	setupMemory: `const buzz = defmod("buzz", { cat: "sources" }, ({ sr, shape = "sin" }) => {
  let phase = 0
  return ({ pitch = 57 }) => {
    const hz = 440 * 2 ** ((pitch - 69) / 12)
    phase = (phase + hz / sr) % 1
    return shape === "sqr" ? (phase < 0.5 ? 1 : -1) : Math.sin(phase * 2 * Math.PI)
  }
})
buzz({ pitch: 48, shape: "sqr" }).gain(0.2).out()`,

	inputsUnits: `const echo = defmod("echo", { cat: "effects" }, ({ sr }) => {
  const buf = new Float64Array(sr)
  let w = 0
  return ({ in: x = 0, time = secs(0.25), fb = range(0.5, 0, 0.95) }) => {
    const r = (((w - time * sr) % buf.length) + buf.length) % buf.length
    const y = x + buf[Math.floor(r)] * fb
    buf[w] = y
    w = (w + 1) % buf.length
    return y
  }
})
tempo(100)
const s = seq("c3 ~ e3 ~")
s.tri()
  .mul(s.gate.ad(0.005, 0.2))
  .echo({ time: secs(0.3), fb: 0.6 })
  .gain(0.3)
  .out()`,

	outputsRecord: `const tilt = defmod("tilt", { cat: "effects" }, () => {
  let lp = 0
  return ({ in: x = 0, mix = 0.5 }) => {
    lp = lp + (x - lp) * 0.02
    const hp = x - lp
    return { lo: lp, hi: hp }
  }
})
const s = saw(45)
const t = s.tilt()
t.lo.gain(0.25).out()
t.hi.gain(0.1).out()`,

	helpers: `function wrapIndex(k, n) { return ((Math.floor(k) % n) + n) % n }

const echo = defmod("echo", { cat: "effects" }, ({ sr }) => {
  const buf = new Float64Array(sr)
  let w = 0
  return ({ in: x = 0, time = secs(0.25) }) => {
    const y = x + buf[wrapIndex(w - time * sr, buf.length)] * 0.5
    buf[w] = y
    w = (w + 1) % buf.length
    return y
  }
})
tri(60).echo().gain(0.2).out()`,

	workingWithData: `const bank = defmod("bank", { cat: "sources" }, ({ sr }) => {
  const voices = [
    { phase: 0, hz: 220 },
    { phase: 0.33, hz: 277 },
    { phase: 0.66, hz: 330 },
  ]
  return () => {
    let sum = 0
    for (const v of voices) {
      v.phase = (v.phase + v.hz / sr) % 1
      sum += Math.sin(v.phase * 2 * Math.PI)
    }
    return sum / voices.length
  }
})
bank().gain(0.25).out()`,

	portGroups: `const mymix = defmod("mymix", { cat: "utils" }, () => {
  return ({ ch = group(sig(0), { open: true }), level = group(unit(1), { like: "ch" }) }) => {
    let sum = 0
    for (let k = 0; k < ch.length; k++) sum += ch[k] * level[k]
    return sum
  }
})
mymix({ ch: [sin(57), sin(64), sin(60)], level: [1, 0.6, 0.8] }).gain(0.2).out()`,

	randomness: `const crackle = defmod("crackle", { cat: "sources" }, () => {
  return ({ rate = 0.1 }) => (Math.random() < rate ? Math.random() * 2 - 1 : 0)
})
crackle(0.15).gain(0.3).out()`,

	randomnessSeeded: `const hiss = defmod("hiss", { cat: "sources" }, () => {
  let step = 0
  return ({ hold = 8 }) => {
    const at = Math.floor(step / hold)
    step += 1
    return hashRandom(at) * 2 - 1
  }
})
hiss(6).gain(0.2).out()`,

	liveEdit: `const drone = defmod("drone", { cat: "sources" }, ({ sr }) => {
  let phase = 0
  return ({ pitch = 45 }) => {
    const hz = 440 * 2 ** ((pitch - 69) / 12)
    phase = (phase + hz / sr) % 1
    return Math.sin(phase * 2 * Math.PI)
  }
})
drone(45).gain(0.25).out()`,

	meta: `const wavefold = defmod(
  "wavefold",
  { cat: "effects", doc: "Sine-shaper wavefolder.", args: ["amount"] },
  () => {
    return ({ in: x = 0, amount = range(0.5, 0, 1) }) => Math.sin(x * (1 + amount * 6))
  },
)
saw(48).wavefold(0.7).gain(0.25).out()`,

	defpatch: `const voice = defpatch("voice", ({ in: pitch, cutoff = 84 }) => pitch.saw().lpf(cutoff))
tempo(110)
const s = seq("c3 e3 g3 e3")
s.voice(90)
  .mul(s.gate.adsr(0.005, 0.1, 0.5, 0.15))
  .gain(0.3)
  .out()`,

	whatCompilerChecks: `const safeFold = defmod("safeFold", { cat: "effects" }, () => {
  const stageScratch = new Float64Array(1)
  return ({ in: x = 0, amount = range(0.5, 0, 1) }) => {
    stageScratch[0] = Math.sin(x * (1 + amount * 6))
    return stageScratch[0]
  }
})
tri(52).safeFold(0.6).gain(0.25).out()`,
} as const;
