/**
 * The module dsp page's content: chapters of bricks, one idea and one
 * runnable patch each, in the same shape as the guide. In `text`,
 * `backticks` mark inline code.
 */

import type { Chapter } from "@/ui/site/bricks/types";

export const CHAPTERS: readonly Chapter[] = [
	{
		title: "A first module",
		bricks: [
			{
				text: "Use `defmod` to write a module. Its inner function runs once per sample and returns the output. `in` is the input a chain feeds.",
				code: `const fold = defmod("fold", () => {
  return ({ in: x = 0 }) => Math.sin(x * 3)
})
tri(55).fold().gain(0.3).out()`,
				graph: true,
			},
			{
				text: "Add a parameter to add an input. Its default is the value when nothing is plugged in.",
				code: `const fold = defmod("fold", () => {
  return ({ in: x = 0, amount = 0.5 }) => Math.sin(x * (1 + amount * 6))
})
tri(55).fold().gain(0.3).out()`,
			},
			{
				text: "Set it like any input.",
				code: `const fold = defmod("fold", () => {
  return ({ in: x = 0, amount = 0.5 }) => Math.sin(x * (1 + amount * 6))
})
tri(55).fold({ amount: 0.9 }).gain(0.3).out()`,
			},
			{
				text: "Pass a signal to it.",
				code: `const fold = defmod("fold", () => {
  return ({ in: x = 0, amount = 0.5 }) => Math.sin(x * (1 + amount * 6))
})
const depth = lfo(0.2, 0, 1)
tri(55).fold({ amount: depth }).gain(0.3).out()`,
			},
			{
				text: "Use `scope` to see what it does.",
				code: `const fold = defmod("fold", () => {
  return ({ in: x = 0, amount = 0.5 }) => Math.sin(x * (1 + amount * 6))
})
const depth = lfo(0.2, 0, 1)
tri(55).fold({ amount: depth }).scope().gain(0.3).out()`,
			},
		],
	},
	{
		title: "Setup and memory",
		bricks: [
			{
				text: "Use the outer function for setup. It runs once, and its locals are the module's memory. `sr` is the sample rate.",
				code: `const buzz = defmod("buzz", ({ sr }) => {
  let phase = 0
  return ({ freq = 220 }) => {
    phase = (phase + freq / sr) % 1
    return phase * 2 - 1
  }
})
buzz().gain(0.2).out()`,
			},
			{
				text: 'Give an input a unit. A patch can then pass any unit, and `"c3"` arrives in Hz.',
				code: `const buzz = defmod("buzz", ({ sr }) => {
  let phase = 0
  return ({ freq = hz(220) }) => {
    phase = (phase + freq / sr) % 1
    return phase * 2 - 1
  }
})
buzz({ freq: "c3" }).gain(0.2).out()`,
			},
			{
				text: "Use `args` to set inputs by position.",
				code: `const buzz = defmod("buzz", { args: ["freq"] }, ({ sr }) => {
  let phase = 0
  return ({ freq = hz(220) }) => {
    phase = (phase + freq / sr) % 1
    return phase * 2 - 1
  }
})
buzz("c3").gain(0.2).out()`,
			},
			{
				text: "Add a parameter to setup for a setting. A patch sets it by name.",
				code: `const buzz = defmod("buzz", { args: ["freq"] }, ({ sr, shape = "saw" }) => {
  let phase = 0
  return ({ freq = hz(220) }) => {
    phase = (phase + freq / sr) % 1
    if (shape === "sqr") return phase < 0.5 ? 1 : -1
    return phase * 2 - 1
  }
})
buzz({ freq: "c3", shape: "sqr" }).gain(0.2).out()`,
			},
		],
	},
	{
		title: "Buffers",
		bricks: [
			{
				text: "Use a typed array in setup for a buffer. This one holds one second.",
				code: `const echo = defmod("echo", ({ sr }) => {
  const buf = new Float64Array(sr)
  let w = 0
  return ({ in: x = 0, time = secs(0.25) }) => {
    const r = (w - Math.floor(time * sr) + sr) % sr
    const y = x + buf[r] * 0.5
    buf[w] = y
    w = (w + 1) % sr
    return y
  }
})
tempo(110)
const notes = seq("c3 ~ ~ ~ g3 ~ ~ ~")
const env = notes.gate.ad(0.005, 0.1)
notes.tri().gain(env).echo().gain(0.3).out()`,
			},
			{
				text: "Pass `beats()` to a `secs` input to lock it to the tempo.",
				code: `const echo = defmod("echo", ({ sr }) => {
  const buf = new Float64Array(sr)
  let w = 0
  return ({ in: x = 0, time = secs(0.25) }) => {
    const r = (w - Math.floor(time * sr) + sr) % sr
    const y = x + buf[r] * 0.5
    buf[w] = y
    w = (w + 1) % sr
    return y
  }
})
tempo(110)
const notes = seq("c3 ~ ~ ~ g3 ~ ~ ~")
const env = notes.gate.ad(0.005, 0.1)
notes.tri().gain(env).echo({ time: beats(0.75) }).gain(0.3).out()`,
			},
			{
				text: "Use `range(def, min, max)` to set how far a dragged number can go.",
				code: `const echo = defmod("echo", ({ sr }) => {
  const buf = new Float64Array(sr)
  let w = 0
  return ({ in: x = 0, time = secs(0.25), fb = range(0.5, 0, 0.95) }) => {
    const r = (w - Math.floor(time * sr) + sr) % sr
    const y = x + buf[r] * fb
    buf[w] = y
    w = (w + 1) % sr
    return y
  }
})
tempo(110)
const notes = seq("c3 ~ ~ ~ g3 ~ ~ ~")
const env = notes.gate.ad(0.005, 0.1)
notes.tri().gain(env).echo({ time: beats(0.75), fb: 0.7 }).gain(0.3).out()`,
			},
			{
				text: "Write a plain function beside the module to use as a helper.",
				code: `function wrap(k, n) {
  return ((Math.floor(k) % n) + n) % n
}
const echo = defmod("echo", ({ sr }) => {
  const buf = new Float64Array(sr)
  let w = 0
  return ({ in: x = 0, time = secs(0.25), fb = range(0.5, 0, 0.95) }) => {
    const y = x + buf[wrap(w - time * sr, sr)] * fb
    buf[w] = y
    w = (w + 1) % sr
    return y
  }
})
tempo(110)
const notes = seq("c3 ~ ~ ~ g3 ~ ~ ~")
const env = notes.gate.ad(0.005, 0.1)
notes.tri().gain(env).echo({ time: beats(0.75), fb: 0.7 }).gain(0.3).out()`,
			},
		],
	},
	{
		title: "Outputs",
		bricks: [
			{
				text: "Return a record to make several outputs. Read each one by name.",
				code: `const split = defmod("split", () => {
  let lo = 0
  return ({ in: x = 0 }) => {
    lo = lo + (x - lo) * 0.02
    return { lo, hi: x - lo }
  }
})
const bands = saw(45).split()
bands.lo.gain(0.3).out()`,
			},
			{
				text: "Use both.",
				code: `const split = defmod("split", () => {
  let lo = 0
  return ({ in: x = 0 }) => {
    lo = lo + (x - lo) * 0.02
    return { lo, hi: x - lo }
  }
})
const bands = saw(45).split()
bands.lo.gain(0.3).pan(-1).out()
bands.hi.gain(0.1).pan(1).out()`,
				graph: true,
			},
		],
	},
	{
		title: "Data",
		bricks: [
			{
				text: "Use an array of records for many voices. Walk it with `for…of`.",
				code: `const bank = defmod("bank", ({ sr }) => {
  const voices = [
    { phase: 0, freq: 220 },
    { phase: 0.33, freq: 277 },
    { phase: 0.66, freq: 330 },
  ]
  return () => {
    let sum = 0
    for (const v of voices) {
      v.phase = (v.phase + v.freq / sr) % 1
      sum += Math.sin(v.phase * 2 * Math.PI)
    }
    return sum / voices.length
  }
})
bank().gain(0.25).out()`,
			},
			{
				text: "Use `group` for an input that takes any number of signals. The tick gets them as an array.",
				code: `const sum = defmod("sum", () => {
  return ({ ch = group(sig(0), { open: true }) }) => {
    let total = 0
    for (let k = 0; k < ch.length; k++) total += ch[k]
    return total / ch.length
  }
})
sum({ ch: [sin(57), sin(64), sin(60)] }).gain(0.3).out()`,
			},
			{
				text: "Use `like` to give a second group one slot per channel.",
				code: `const sum = defmod("sum", () => {
  return ({ ch = group(sig(0), { open: true }), level = group(unit(1), { like: "ch" }) }) => {
    let total = 0
    for (let k = 0; k < ch.length; k++) total += ch[k] * level[k]
    return total / ch.length
  }
})
sum({ ch: [sin(57), sin(64), sin(60)], level: [1, 0.3, 0.6] }).gain(0.3).out()`,
			},
		],
	},
	{
		title: "Randomness",
		bricks: [
			{
				text: "Use `Math.random()` for noise. Each voice has its own seeded stream, so the same seed sounds the same.",
				code: `const crackle = defmod("crackle", () => {
  return ({ rate = 0.1 }) => (Math.random() < rate ? Math.random() * 2 - 1 : 0)
})
crackle({ rate: 0.15 }).gain(0.3).out()`,
			},
			{
				text: "Use `hashRandom(key)` for a value that comes back with its key. Here each value holds for six samples.",
				code: `const hiss = defmod("hiss", () => {
  let step = 0
  return ({ hold = 6 }) => {
    const at = Math.floor(step / hold)
    step += 1
    return hashRandom(at) * 2 - 1
  }
})
hiss().gain(0.2).out()`,
			},
		],
	},
	{
		title: "Edit while it plays",
		bricks: [
			{
				text: "Change the code and run it again while it plays. `phase` carries over, so the sound does not restart. Try `return Math.sin(phase * 2 * Math.PI) ** 3`.",
				code: `const drone = defmod("drone", ({ sr }) => {
  let phase = 0
  return ({ freq = hz(110) }) => {
    phase = (phase + freq / sr) % 1
    return Math.sin(phase * 2 * Math.PI)
  }
})
drone().gain(0.25).out()`,
			},
		],
	},
	{
		title: "Modules from chains",
		bricks: [
			{
				text: "Use `defpatch` to save a chain as a module. Its parameters name the inputs.",
				code: `const voice = defpatch("voice", ({ in: pitch, cutoff = 84 }) => pitch.saw().lpf(cutoff))
tempo(110)
const notes = seq("c3 e3 g3 e3")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.15)
notes.voice(72).gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `defpatch` to mix existing modules, and `defmod` to make new sound.",
				code: `const fold = defmod("fold", () => {
  return ({ in: x = 0, amount = 0.5 }) => Math.sin(x * (1 + amount * 6))
})
const voice = defpatch("voice", ({ in: pitch, cutoff = 84 }) => pitch.tri().fold(0.7).lpf(cutoff))
tempo(110)
const notes = seq("c3 e3 g3 e3")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.15)
notes.voice(84).gain(env).gain(0.3).out()`,
			},
		],
	},
	{
		title: "Fast ticks",
		bricks: [
			{
				text: "Build arrays and records in setup. The tick reads and writes them in place.",
				code: `const fold = defmod("fold", () => {
  const scratch = new Float64Array(1)
  return ({ in: x = 0, amount = range(0.5, 0, 1) }) => {
    scratch[0] = Math.sin(x * (1 + amount * 6))
    return scratch[0]
  }
})
tri(52).fold(0.6).gain(0.25).out()`,
			},
		],
	},
];
