/**
 * The brick guide's content: chapters of bricks, one idea and one runnable
 * patch each. Each patch changes one thing from the brick before it. In
 * `text`, `backticks` mark inline code.
 */

export interface Brick {
	readonly text: string;
	readonly code: string;
	/** Open the patch graph: the brick's lesson is the patch's shape. */
	readonly graph?: true;
}

export interface Chapter {
	readonly title: string;
	readonly bricks: readonly Brick[];
}

export const CHAPTERS: readonly Chapter[] = [
	{
		title: "A sound",
		bricks: [
			{
				text: "Call modules to start a chain. `sin` makes a tone, `gain` sets the volume, and `out` sends it to the speakers.",
				code: "sin().gain(0.3).out()",
			},
			{
				text: "An argument sets an input. Here it sets the pitch.",
				code: "sin(60).gain(0.3).out()",
			},
			{
				text: "You can set an input by name.",
				code: "sin({ pitch: 60 }).gain(0.3).out()",
			},
			{
				text: "Or with a setter.",
				code: "sin().pitch(60).gain(0.3).out()",
			},
			{
				text: "`a().b()` is the same as `b(a())`.",
				code: "out(sin(60).gain(0.3))",
				graph: true,
			},
		],
	},
	{
		title: "Values",
		bricks: [
			{
				text: "A number at a pitch input counts semitones. 60 is middle C. Add 12 to go up one octave.",
				code: "sin(72).gain(0.3).out()",
			},
			{
				text: 'A note name works too. `"c5"` is 72.',
				code: 'sin("c5").gain(0.3).out()',
			},
			{
				text: "`hz()` gives a value in Hz.",
				code: "sin(hz(440)).gain(0.3).out()",
			},
			{
				text: "An input can also take a signal. Here a slow `sin`, from 48 to 72, sets the pitch.",
				code: "sin(sin(hz(0.2), 48, 72)).gain(0.3).out()",
			},
		],
	},
	{
		title: "Signal math",
		bricks: [
			{
				text: "`add` adds to a signal. 7 semitones up is a fifth.",
				code: "sin(sin(hz(0.2), 48, 72).add(7)).gain(0.3).out()",
			},
			{
				text: "`gain` takes a signal too. A fast one makes the volume pulse.",
				code: "sin(60).gain(sin(hz(4), 0.1, 0.3)).out()",
			},
			{
				text: "Turn it up, then `clip` cuts off the peaks. It sounds harsher.",
				code: "sin(48).gain(3).clip(-0.3, 0.3).out()",
			},
		],
	},
	{
		title: "Parts in variables",
		bricks: [
			{
				text: "A `const` holds a part of a patch.",
				code: `const tone = sin(60)
tone.gain(0.3).out()`,
			},
			{
				text: "A part can feed an input.",
				code: `const wobble = sin(hz(0.2), 48, 72)
sin(wobble).gain(0.3).out()`,
			},
			{
				text: "One part can feed two places.",
				code: `const wobble = sin(hz(0.2), 48, 72)
sin(wobble).gain(0.3).out()
sin(wobble.add(7)).gain(0.3).out()`,
				graph: true,
			},
			{
				text: "A setter makes a new part. `a` still plays 60.",
				code: `const a = sin(60)
const b = a.pitch(67)
a.gain(0.3).out()
b.gain(0.3).out()`,
				graph: true,
			},
			{
				text: "A part that never reaches `out` makes no sound.",
				code: `const a = sin(60)
const b = a.pitch(67)
a.gain(0.3).out()`,
				graph: true,
			},
		],
	},
	{
		title: "See and touch",
		bricks: [
			{
				text: "`scope` draws the wave. The sound still plays.",
				code: "sin(60).scope().gain(0.3).out()",
			},
			{
				text: "A scope draws even with no `out`. `2` shows two seconds at once.",
				code: "sin(hz(0.5)).scope(2)",
			},
			{
				text: "`add` on a sound lifts the wave. The note stays the same. To change the note, add to the pitch.",
				code: "sin(60).scope({ lifted: sin(60).add(0.5) })",
			},
			{
				text: "A knob appears in the editor. Turn it while the sound plays.",
				code: "sin(knob(60, 48, 72)).gain(0.3).out()",
			},
			{
				text: "The same, as a slider.",
				code: "sin(slider(60, 48, 72)).gain(0.3).out()",
			},
			{
				text: "Some modules have more than one output. Read one by name.",
				code: `const pad = xy(60, 60, 48, 72)
sin(pad.x).gain(0.2).out()
sin(pad.y).gain(0.2).out()`,
			},
			{
				text: "A switch turns the sound on and off.",
				code: "sin(60).gain(0.3).gain(toggle()).out()",
			},
			{
				text: "The sound plays while you hold the button.",
				code: "sin(60).gain(0.3).gain(button()).out()",
			},
		],
	},
	{
		title: "Sound modules",
		bricks: [
			{
				text: "`tri`, `saw` and `sqr` are other wave shapes.",
				code: "tri(60).gain(0.3).out()",
			},
			{
				text: "`noise` has no pitch.",
				code: "noise().gain(0.1).out()",
			},
			{
				text: "A filter cuts the highs above its cutoff. The cutoff is a pitch too.",
				code: "saw(48).lpf(72).gain(0.3).out()",
			},
			{
				text: "The second input makes the filter ring.",
				code: "saw(48).lpf(72, 0.6).gain(0.3).out()",
			},
			{
				text: "A part can be a whole chain.",
				code: `const voice = saw(48).lpf(72, 0.6)
voice.gain(0.3).out()`,
			},
			{
				text: "A function makes parts.",
				code: `const voice = (pitch) => saw(pitch).lpf(72, 0.6).gain(0.2)
voice(48).out()
voice(55).out()`,
			},
			{
				text: "`lfo` is like `sin`, but its first input is in Hz. This is the same sound as `sin(sin(hz(0.2), 48, 72))`.",
				code: "sin(lfo(0.2, 48, 72)).gain(0.3).out()",
			},
		],
	},
	{
		title: "Move a knob",
		bricks: [
			{
				text: "Turn the cutoff by hand.",
				code: `saw(48)
  .lpf(knob(72, 48, 96), 0.6)
  .gain(0.3)
  .out()`,
			},
			{
				text: "An LFO turns it for you.",
				code: `saw(48)
  .lpf(lfo(0.3, 60, 96), 0.6)
  .gain(0.3)
  .out()`,
			},
			{
				text: "`mod` adds movement on top of a set value. Here: 72, up and down by 12.",
				code: `saw(48)
  .lpf(72, 0.6)
  .mod("cutoff", lfo(0.3), 12)
  .gain(0.3)
  .out()`,
			},
			{
				text: "Turn the set value by hand while the LFO moves it.",
				code: `saw(48)
  .lpf(knob(72, 48, 96), 0.6)
  .mod("cutoff", lfo(0.3), 12)
  .gain(0.3)
  .out()`,
			},
		],
	},
	{
		title: "Notes in time",
		bricks: [
			{
				text: "`seq` plays notes in turn. `tempo` sets the speed. One pattern is one bar.",
				code: `tempo(120)
seq("c3 e3 g3 e3").tri().gain(0.3).out()`,
			},
			{
				text: "`~` is a rest. `s.gate` is 1 while a note plays. `ar` rounds its edges.",
				code: `tempo(120)
const s = seq("c3 ~ g3 ~")
s.tri().gain(s.gate.ar(0.005, 0.05)).gain(0.3).out()`,
			},
			{
				text: "`adsr` is a fuller envelope: attack, decay, sustain, release.",
				code: `tempo(120)
const s = seq("c3 ~ g3 ~")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "A `saw` through a low filter is darker.",
				code: `tempo(120)
const s = seq("c3 ~ g3 ~")
s.saw()
  .lpf(60, 0.5)
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "An envelope on the cutoff makes a pluck.",
				code: `tempo(120)
const s = seq("c3 ~ g3 ~")
s.saw()
  .lpf(60, 0.5)
  .mod("cutoff", s.gate.ad(0.01, 0.2), 36)
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
		],
	},
	{
		title: "Pattern symbols",
		bricks: [
			{
				text: "`[ ]` fits two notes in one step.",
				code: `tempo(120)
const s = seq("c3 [e3 g3]")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "`< >` picks a different note each bar.",
				code: `tempo(120)
const s = seq("c3 <e3 g3>")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "`*2` plays a note twice in its step.",
				code: `tempo(120)
const s = seq("c3*2 e3")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "`_` holds a note one more step.",
				code: `tempo(120)
const s = seq("c3 _ e3 g3")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "`?` plays the note only some of the time.",
				code: `tempo(120)
const s = seq("c3? e3? g3? c4?")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "`seed` fixes the random choices. Every play sounds the same.",
				code: `tempo(120)
seed(7)
const s = seq("c3? e3? g3? c4?")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
		],
	},
	{
		title: "Drums",
		bricks: [
			{
				text: "`trig` is a click when each note starts. Drums play on it. The note does not matter to a drum.",
				code: `tempo(120)
seq("60*4").trig.kick().out()`,
			},
			{
				text: "Three lines make a beat.",
				code: `tempo(120)
seq("60*4").trig.kick().out()
seq("~ 60 ~ 60").trig.snare().gain(0.6).out()
seq("60*8").trig.hihat().gain(0.4).out()`,
			},
			{
				text: "`(3,8)` spreads 3 hits over 8 steps.",
				code: `tempo(120)
seq("60(3,8)").trig.kick().out()
seq("~ 60 ~ 60").trig.snare().gain(0.6).out()
seq("60*8").trig.hihat().gain(0.4).out()`,
			},
			{
				text: "Drums have inputs too. This hat is short.",
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
				text: "Commas make a chord.",
				code: `tempo(90)
const s = seq("[c3,e3,g3]")
s.tri()
  .gain(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.2)
  .out()`,
			},
			{
				text: "`pan` places the sound. -1 is left, 1 is right.",
				code: `tempo(90)
const s = seq("[c3,e3,g3]")
s.tri()
  .gain(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.2)
  .pan(-0.5)
  .out()`,
			},
			{
				text: "An LFO moves it side to side.",
				code: `tempo(90)
const s = seq("[c3,e3,g3]")
s.tri()
  .gain(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.2)
  .pan(lfo(0.5))
  .out()`,
			},
		],
	},
	{
		title: "Change patterns",
		bricks: [
			{
				text: "`p` makes a pattern you can change. `fast(2)` plays it twice per bar.",
				code: `tempo(120)
const s = seq(p\`c3 e3 g3\`.fast(2))
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "`rev` plays it backwards.",
				code: `tempo(120)
const s = seq(p\`c3 e3 g3\`.rev())
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "`add` moves every note.",
				code: `tempo(120)
const s = seq(p\`c3 e3 g3\`.add(7))
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "`every` changes some bars. Here every second bar goes up an octave.",
				code: `tempo(120)
const s = seq(p\`c3 e3 g3\`.every(2, (q) => q.add(12)))
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.5, 0.2))
  .gain(0.3)
  .out()`,
			},
			{
				text: "A pattern can set a knob. It moves in steps.",
				code: `tempo(120)
saw(48)
  .lpf(p\`60 72 84\`, 0.5)
  .gain(0.3)
  .out()`,
			},
			{
				text: "`slew` smooths the steps.",
				code: `tempo(120)
const cutoff = slew({ in: p\`60 72 84\`, rise: 0.1, fall: 0.1 })
saw(48)
  .lpf(cutoff, 0.5)
  .gain(0.3)
  .out()`,
			},
			{
				text: "`quantize` snaps any pitch to a scale.",
				code: `quantize({ pitch: lfo(0.2, 48, 72), scaleName: "minor" })
  .tri()
  .gain(0.3)
  .out()`,
			},
			{
				text: "A pattern with commas makes copies. These three are a little out of tune. `spread` sets them wide.",
				code: `tempo(90)
const s = seq("c3 g2")
s.add(p\`[-0.1, 0, 0.1]\`)
  .saw()
  .lpf(84)
  .gain(s.gate.adsr(0.01, 0.2, 0.7, 0.3))
  .gain(0.2)
  .spread()
  .out()`,
			},
			{
				text: "`counter` steps through a pattern once per `trig`. Here three steps run over eight notes.",
				code: `tempo(110)
const s = seq("c2*8")
const accent = counter(s.trig).seq(p\`0.3 0.1 0.2\`.steps())
s.tri()
  .gain(s.gate.ad(0.003, 0.08))
  .gain(accent)
  .out()`,
			},
		],
	},
	{
		title: "Mix and effects",
		bricks: [
			{
				text: "`mixer` sums named channels. `level` sets one channel.",
				code: `tempo(120)
const bass = seq("c2 ~ c2 g1").saw().lpf(60)
const lead = seq("c4 e4 g4 e4").tri()
mixer({ bass, lead })
  .level({ lead: 0.5 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "`delay` makes an echo.",
				code: `tempo(120)
const s = seq("c3 ~ ~ g3 ~ ~ ~ ~")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.3, 0.1))
  .delay({ time: 0.25, feedback: 0.4, mix: 0.3 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "`beats()` gives a time in beats.",
				code: `tempo(120)
const s = seq("c3 ~ ~ g3 ~ ~ ~ ~")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.3, 0.1))
  .delay({ time: beats(0.75), feedback: 0.4, mix: 0.3 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "`tape` is a darker echo that wobbles.",
				code: `tempo(120)
const s = seq("c3 ~ ~ g3 ~ ~ ~ ~")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.3, 0.1))
  .tape({ time: beats(0.75), feedback: 0.5, mix: 0.4 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "`reverb` puts the sound in a room.",
				code: `tempo(120)
const s = seq("c3 ~ ~ g3 ~ ~ ~ ~")
s.tri()
  .gain(s.gate.adsr(0.005, 0.1, 0.3, 0.1))
  .reverb({ room: 0.8, mix: 0.4 })
  .gain(0.3)
  .out()`,
			},
			{
				text: "`loop` feeds the output back in, one sample late. Here it builds an echo by hand.",
				code: `tempo(120)
const s = seq("c3 ~ ~ ~ g3 ~ ~ ~")
const dry = s.tri().gain(s.gate.ad(0.005, 0.1))
loop((fb) => dry.add(fb.delay({ time: 0.3, mix: 1 }).gain(0.5)))
  .gain(0.3)
  .out()`,
			},
		],
	},
	{
		title: "When it breaks",
		bricks: [
			{
				text: "An error says what is wrong and what you can use. Run this one.",
				code: "sin({ ptich: 60 }).out()",
			},
			{
				text: "`sin(0)` is a very low note, not silence. You cannot hear it, but the scope shows it.",
				code: "sin(0).scope(1)",
			},
		],
	},
];
