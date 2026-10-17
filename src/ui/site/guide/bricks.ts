/**
 * The brick guide's content: chapters of bricks, one idea and one runnable
 * patch each. Each patch changes one thing from the brick before it. In
 * `text`, `backticks` mark inline code.
 */

import type { Chapter } from "@/ui/site/bricks/types";

export const CHAPTERS: readonly Chapter[] = [
	{
		title: "A sound",
		bricks: [
			{
				text: "Call a module to make a sound. Use `sin` for a tone, `gain` for the volume, and `out` for the speakers.",
				code: "sin().gain(0.3).out()",
			},
			{
				text: "Pass an argument to set an input. Here it sets the pitch.",
				code: "sin(60).gain(0.3).out()",
			},
			{
				text: "Set an input by name.",
				code: "sin({ pitch: 60 }).gain(0.3).out()",
			},
			{
				text: "Or use a setter.",
				code: "sin().pitch(60).gain(0.3).out()",
			},
			{
				text: "Write `a().b()` or `b(a())`. They are the same.",
				code: "out(sin(60).gain(0.3))",
				graph: true,
			},
		],
	},
	{
		title: "Variables",
		bricks: [
			{
				text: "Use `const` to name a chain.",
				code: `const tone = sin(60).gain(0.3)
tone.out()`,
			},
			{
				text: "Pass a named chain to an input.",
				code: `const tone = sin(60).gain(0.3)
out(tone)`,
			},
			{
				text: "Use a setter to make a new chain. `a` still plays 60.",
				code: `const a = sin(60)
const b = a.pitch(67)
a.gain(0.3).out()
b.gain(0.3).out()`,
				graph: true,
			},
			{
				text: "Send a chain to `out` to hear it. `b` never gets there.",
				code: `const a = sin(60)
const b = a.pitch(67)
a.gain(0.3).out()`,
				graph: true,
			},
		],
	},
	{
		title: "Values",
		bricks: [
			{
				text: "Give pitch in semitones. 60 is middle C. Add 12 to go up one octave.",
				code: "sin(72).gain(0.3).out()",
			},
			{
				text: 'Or use a note name. `"c5"` is 72.',
				code: 'sin("c5").gain(0.3).out()',
			},
			{
				text: "Use `hz()` to give a value in Hz.",
				code: "sin(hz(440)).gain(0.3).out()",
			},
			{
				text: "Pass a signal to any input. Here a slow `sin`, from 48 to 72, sets the pitch.",
				code: `const wobble = sin(hz(0.2), 48, 72)
sin(wobble).gain(0.3).out()`,
			},
		],
	},
	{
		title: "Signal math",
		bricks: [
			{
				text: "Use `add` to add to a signal. 7 semitones up is a fifth.",
				code: `const wobble = sin(hz(0.2), 48, 72)
sin(wobble.add(7)).gain(0.3).out()`,
			},
			{
				text: "Use one chain in two places.",
				code: `const wobble = sin(hz(0.2), 48, 72)
sin(wobble).gain(0.3).out()
sin(wobble.add(7)).gain(0.3).out()`,
				graph: true,
			},
			{
				text: "Pass a signal to `gain` to make the volume pulse.",
				code: `const pulse = sin(hz(4), 0.1, 0.3)
sin(60).gain(pulse).out()`,
			},
			{
				text: "Use `clip` to cut off the peaks. Turn the sound up first to make it harsher.",
				code: "sin(48).gain(3).clip(-0.3, 0.3).out()",
			},
		],
	},
	{
		title: "See and touch",
		bricks: [
			{
				text: "Use `scope` to draw the wave. The sound still plays.",
				code: "sin(60).scope().gain(0.3).out()",
			},
			{
				text: "Use `scope` without `out` to only look. `2` shows two seconds at once.",
				code: "sin(hz(0.5)).scope(2)",
			},
			{
				text: "Use `scope` to see why `add` on a sound does not change the note: it only lifts the wave. To change the note, add to the pitch.",
				code: `const tone = sin(60)
tone.scope({ lifted: tone.add(0.5) })`,
			},
			{
				text: "Use `knob` to draw a control you can turn while the sound plays.",
				code: `const pitch = knob(60, 48, 72)
sin(pitch).gain(0.3).out()`,
			},
			{
				text: "Use `slider` for the same thing as a slider.",
				code: `const pitch = slider(60, 48, 72)
sin(pitch).gain(0.3).out()`,
			},
			{
				text: "Use `xy` to draw a pad. Read each output by name: `pad.x`, `pad.y`.",
				code: `const pad = xy(60, 60, 48, 72)
sin(pad.x).gain(0.2).out()
sin(pad.y).gain(0.2).out()`,
			},
			{
				text: "Use `toggle` to draw a switch that turns the sound on and off.",
				code: `const on = toggle()
sin(60).gain(0.3).gain(on).out()`,
			},
			{
				text: "Use `button` to draw a button. The sound plays while you hold it.",
				code: `const held = button()
sin(60).gain(0.3).gain(held).out()`,
			},
		],
	},
	{
		title: "Sound modules",
		bricks: [
			{
				text: "Use `tri`, `saw` or `sqr` for other wave shapes.",
				code: "tri(60).gain(0.3).out()",
			},
			{
				text: "Use `noise` for a sound with no pitch.",
				code: "noise().gain(0.1).out()",
			},
			{
				text: "Use `lpf` to cut the highs above a cutoff. Give the cutoff as a pitch too.",
				code: "saw(48).lpf(72).gain(0.3).out()",
			},
			{
				text: "Raise the second input to make the filter ring.",
				code: "saw(48).lpf(72, 0.6).gain(0.3).out()",
			},
			{
				text: "Use a function to make chains.",
				code: `const voice = (pitch) => saw(pitch).lpf(72, 0.6).gain(0.2)
voice(48).out()
voice(55).out()`,
			},
			{
				text: "Use `lfo` for slow movement. Its first input is in Hz. This is the same as `sin(hz(0.2), 48, 72)`.",
				code: `const wobble = lfo(0.2, 48, 72)
sin(wobble).gain(0.3).out()`,
			},
		],
	},
	{
		title: "Move an input",
		bricks: [
			{
				text: "Use a `knob` to turn the cutoff by hand.",
				code: `const cutoff = knob(72, 48, 96)
saw(48)
  .lpf(cutoff, 0.6)
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use an `lfo` to turn it for you.",
				code: `const cutoff = lfo(0.3, 60, 96)
saw(48)
  .lpf(cutoff, 0.6)
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use `mod` to add movement on top of a set value. Here: 72, up and down by 12.",
				code: `const sweep = lfo(0.3)
saw(48)
  .lpf(72, 0.6)
  .mod("cutoff", sweep, 12)
  .gain(0.3)
  .out()`,
			},
			{
				text: "Turn the set value by hand while the LFO moves it.",
				code: `const cutoff = knob(72, 48, 96)
const sweep = lfo(0.3)
saw(48)
  .lpf(cutoff, 0.6)
  .mod("cutoff", sweep, 12)
  .gain(0.3)
  .out()`,
			},
		],
	},
	{
		title: "Notes in time",
		bricks: [
			{
				text: "Use `seq` to play notes in turn, and `tempo` to set the speed. One pattern is one bar.",
				code: `tempo(120)
seq("c3 e3 g3 e3").tri().gain(0.3).out()`,
			},
			{
				text: "Use `~` for a rest. Pass `notes.gate` to `gain` to silence the rests. `ar` rounds its edges.",
				code: `tempo(120)
const notes = seq("c3 ~ g3 ~")
const env = notes.gate.ar(0.005, 0.05)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `adsr` for a fuller envelope: attack, decay, sustain, release.",
				code: `tempo(120)
const notes = seq("c3 ~ g3 ~")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use a `saw` through a low filter for a darker sound.",
				code: `tempo(120)
const notes = seq("c3 ~ g3 ~")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.saw()
  .lpf(60, 0.5)
  .gain(env)
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use `mod` with an envelope on the cutoff to make a pluck.",
				code: `tempo(120)
const notes = seq("c3 ~ g3 ~")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
const pluck = notes.gate.ad(0.01, 0.2)
notes.saw()
  .lpf(60, 0.5)
  .mod("cutoff", pluck, 36)
  .gain(env)
  .gain(0.3)
  .out()`,
			},
		],
	},
	{
		title: "Pattern symbols",
		bricks: [
			{
				text: "Use `[ ]` to fit two notes in one step.",
				code: `tempo(120)
const notes = seq("c3 [e3 g3]")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `< >` to pick a different note each bar.",
				code: `tempo(120)
const notes = seq("c3 <e3 g3>")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `*2` to play a note twice in its step.",
				code: `tempo(120)
const notes = seq("c3*2 e3")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `_` to hold a note one more step.",
				code: `tempo(120)
const notes = seq("c3 _ e3 g3")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `?` to play a note only some of the time.",
				code: `tempo(120)
const notes = seq("c3? e3? g3? c4?")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `seed` to fix the random choices. Every play sounds the same.",
				code: `tempo(120)
seed(7)
const notes = seq("c3? e3? g3? c4?")
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
		],
	},
	{
		title: "Drums",
		bricks: [
			{
				text: "Use `trig` to play drums. It clicks when each note starts. The note does not matter to a drum.",
				code: `tempo(120)
seq("60*4").trig.kick().out()`,
			},
			{
				text: "Use three lines to make a beat.",
				code: `tempo(120)
seq("60*4").trig.kick().out()
seq("~ 60 ~ 60").trig.snare().gain(0.6).out()
seq("60*8").trig.hihat().gain(0.4).out()`,
			},
			{
				text: "Use `(3,8)` to spread 3 hits over 8 steps.",
				code: `tempo(120)
seq("60(3,8)").trig.kick().out()
seq("~ 60 ~ 60").trig.snare().gain(0.6).out()
seq("60*8").trig.hihat().gain(0.4).out()`,
			},
			{
				text: "Set a drum's inputs to change its sound. This hat is short.",
				code: `tempo(120)
seq("60(3,8)").trig.kick().out()
seq("~ 60 ~ 60").trig.snare().gain(0.6).out()
seq("60*8").trig.hihat({ decay: 0.02 }).gain(0.4).out()`,
			},
		],
	},
	{
		title: "Chords and stereo",
		bricks: [
			{
				text: "Use commas to make a chord.",
				code: `tempo(90)
const notes = seq("[c3,e3,g3]")
const env = notes.gate.adsr(0.02, 0.2, 0.7, 0.4)
notes.tri().gain(env).gain(0.2).out()`,
			},
			{
				text: "Use `pan` to place the sound. -1 is left, 1 is right.",
				code: `tempo(90)
const notes = seq("[c3,e3,g3]")
const env = notes.gate.adsr(0.02, 0.2, 0.7, 0.4)
notes.tri().gain(env).gain(0.2).pan(-0.5).out()`,
			},
			{
				text: "Use an `lfo` to move it side to side.",
				code: `tempo(90)
const notes = seq("[c3,e3,g3]")
const env = notes.gate.adsr(0.02, 0.2, 0.7, 0.4)
const swing = lfo(0.5)
notes.tri().gain(env).gain(0.2).pan(swing).out()`,
			},
		],
	},
	{
		title: "Change patterns",
		bricks: [
			{
				text: "Use `p` to make a pattern you can change. `fast(2)` plays it twice per bar.",
				code: `tempo(120)
const melody = p\`c3 e3 g3\`.fast(2)
const notes = seq(melody)
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `rev` to play it backwards.",
				code: `tempo(120)
const melody = p\`c3 e3 g3\`.rev()
const notes = seq(melody)
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `add` to move every note.",
				code: `tempo(120)
const melody = p\`c3 e3 g3\`.add(7)
const notes = seq(melody)
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Use `every` to change some bars. Here every second bar goes up an octave.",
				code: `tempo(120)
const melody = p\`c3 e3 g3\`.every(2, (q) => q.add(12))
const notes = seq(melody)
const env = notes.gate.adsr(0.005, 0.1, 0.5, 0.2)
notes.tri().gain(env).gain(0.3).out()`,
			},
			{
				text: "Pass a pattern to an input to set it in steps.",
				code: `tempo(120)
const cutoff = p\`60 72 84\`
saw(48)
  .lpf(cutoff, 0.5)
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use `slew` to smooth the steps.",
				code: `tempo(120)
const cutoff = slew({ in: p\`60 72 84\`, rise: 0.1, fall: 0.1 })
saw(48)
  .lpf(cutoff, 0.5)
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use `quantize` to snap any pitch to a scale.",
				code: `const wander = lfo(0.2, 48, 72)
quantize({ pitch: wander, scaleName: "minor" })
  .tri()
  .gain(0.3)
  .out()`,
			},
			{
				text: "Add a pattern with commas to make copies. These three are a little out of tune. Use `spread` to set them wide.",
				code: `tempo(90)
const notes = seq("c3 g2")
const detune = p\`[-0.1, 0, 0.1]\`
const env = notes.gate.adsr(0.01, 0.2, 0.7, 0.3)
notes.add(detune)
  .saw()
  .lpf(84)
  .gain(env)
  .gain(0.2)
  .spread()
  .out()`,
			},
			{
				text: "Use `counter` to step through a pattern once per `trig`. Here three steps run over eight notes.",
				code: `tempo(110)
const notes = seq("c2*8")
const env = notes.gate.ad(0.003, 0.08)
const accent = counter(notes.trig).seq(p\`0.3 0.1 0.2\`.steps())
notes.tri().gain(env).gain(accent).out()`,
			},
		],
	},
	{
		title: "Mix and effects",
		bricks: [
			{
				text: "Use `mixer` to sum named channels, and `level` to set one channel.",
				code: `tempo(120)
const bass = seq("c2 ~ c2 g1").saw().lpf(60)
const lead = seq("c4 e4 g4 e4").tri()
mixer({ bass, lead })
  .level({ lead: 0.5 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use `delay` to make an echo.",
				code: `tempo(120)
const notes = seq("c3 ~ ~ g3 ~ ~ ~ ~")
const env = notes.gate.adsr(0.005, 0.1, 0.3, 0.1)
notes.tri()
  .gain(env)
  .delay({ time: 0.25, feedback: 0.4, mix: 0.3 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use `beats()` to give a time in beats.",
				code: `tempo(120)
const notes = seq("c3 ~ ~ g3 ~ ~ ~ ~")
const env = notes.gate.adsr(0.005, 0.1, 0.3, 0.1)
notes.tri()
  .gain(env)
  .delay({ time: beats(0.75), feedback: 0.4, mix: 0.3 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use `tape` for a darker echo that wobbles.",
				code: `tempo(120)
const notes = seq("c3 ~ ~ g3 ~ ~ ~ ~")
const env = notes.gate.adsr(0.005, 0.1, 0.3, 0.1)
notes.tri()
  .gain(env)
  .tape({ time: beats(0.75), feedback: 0.5, mix: 0.4 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use `reverb` to put the sound in a room.",
				code: `tempo(120)
const notes = seq("c3 ~ ~ g3 ~ ~ ~ ~")
const env = notes.gate.adsr(0.005, 0.1, 0.3, 0.1)
notes.tri()
  .gain(env)
  .reverb({ room: 0.8, mix: 0.4 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "Use `loop` to feed the output back in, one sample late. Here it builds an echo by hand.",
				code: `tempo(120)
const notes = seq("c3 ~ ~ ~ g3 ~ ~ ~")
const dry = notes.tri().gain(notes.gate.ad(0.005, 0.1))
const echo = (fb) => dry.add(fb.delay({ time: 0.3, mix: 1 }).gain(0.5))
loop(echo).gain(0.3).out()`,
			},
		],
	},
	{
		title: "When it breaks",
		bricks: [
			{
				text: "Read the error. It says what is wrong and what you can use. Run this one.",
				code: "sin({ ptich: 60 }).out()",
				throws: true,
			},
			{
				text: "Do not use `sin(0)` for silence. It is a very low note. You cannot hear it, but the scope shows it.",
				code: "sin(0).scope(1)",
			},
		],
	},
];
