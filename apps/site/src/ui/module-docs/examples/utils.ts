import type { DocExample } from "@/ui/docs-kit/doc-example";

export const UTILS_EXAMPLES: readonly DocExample[] = [
	// ======================================================================
	// Utils — gain/mul/vca, slew, sah, scale, quantize, mix, z1, out
	// ======================================================================
	{
		section: "Utils",
		title: "gain — a level",
		description: "gain multiplies by a level: 0.25 is the same tone at a quarter amplitude.",
		code: `sin(hz(330))
  .gain(0.25)
  .out()`,
	},
	{
		section: "Utils",
		title: "gain — level modulated",
		description: "An LFO on the level, 0→0.5 — tremolo. A moving gain is all tremolo is.",
		code: `sin(hz(330))
  .gain(lfo(0.5, 0, 0.5))
  .out()`,
	},
	{
		section: "Utils",
		title: "mul — as ring-mod (showcase)",
		description:
			"Two audio-rate sines multiplied — ring modulation. Neither input pitch survives; you hear their sum and difference.",
		code: `sin(hz(330))
  .mul(sin(hz(140)))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "mul — tremolo into sidebands (showcase)",
		description:
			"Tremolo accelerated into the audio band: past ~20 Hz the wobble fuses into sideband tones — modulation becomes timbre.",
		code: `sin(hz(330))
  .mul(lfo(lfo(0.1, 2, 250), 0, 1))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "vca — the canonical patch",
		description:
			"Same module as mul and gain, named for the patch: audio in, envelope on the other input. Every note in these docs is this.",
		code: `tempo(120)
const g = seq("[1 ~]*4")
sin(hz(330))
  .vca(g.gate.adsr(0.01, 0.1, 0.6, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "vca — sidechain duck (showcase)",
		description:
			"The kick's envelope inverted (1 − env) drives the saw's vca — it ducks on every hit. The pump.",
		code: `const c = tempo(120)
c.beat.kick().gain(0.7).out()
saw(57)
  .lpf(89, 0.2)
  .gain(0.25)
  .vca(c.beat.ad(0.005, 0.3).from(1))
  .out()`,
	},
	{
		section: "Utils",
		title: "slew — default",
		description:
			"A stepped LFO (sample-and-held) fed through slew — the jumps are rounded into glides. Portamento on pitch.",
		code: `const c = tempo(240)
sin()
  .pitch(lfo(0.4, 40, 70).sah(c.beat).slew(0.08, 0.08))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "slew — rate modulated",
		description:
			"The same stepped pitch, but an LFO stretches the glide time 0.01→0.3 s — slides from instant jumps to lazy swoops.",
		code: `const c = tempo(240)
const g = lfo(0.2, 0.01, 0.3)
sin()
  .pitch(lfo(0.4, 40, 70).sah(c.beat).slew(g, g))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "sah — default",
		description:
			"White noise sampled and held on each clock trig — a staircase of random pitches, a classic random-note generator.",
		code: `const c = tempo(300)
sin()
  .pitch(noise().scale({ min: 40, max: 76 }).sah(c.beat))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "sah — showcase (random arp)",
		description:
			"Sampled noise quantized to a pentatonic scale on every trig — a tuneful random melody instead of atonal jumps.",
		code: `const c = tempo(360)
const notes = noise().scale({ min: 48, max: 84 }).sah(c.beat)
sin()
  .pitch(notes.quantize({ scaleName: "minor pentatonic", root: 0, octave: 4, range: 3 }))
  .mul(c.beat.ad(0.005, 0.12))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "scale — default",
		description:
			"scale maps a bipolar LFO [-1,1] onto [0,1]: here it drives gain, a smooth tremolo from a raw LFO.",
		code: `sin(hz(330))
  .gain(lfo(0.5).scale({ min: 0, max: 0.5 }))
  .out()`,
	},
	{
		section: "Utils",
		title: "scale — showcase (LFO to cutoff)",
		description:
			"A bipolar sine LFO scaled to [62, 102] semitones (300 Hz→3 kHz) drives a filter cutoff — the idiom for remapping any modulator's range.",
		code: `saw(45)
  .lpf(lfo(0.2).scale({ min: 62, max: 102 }), 0.4)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — default",
		description:
			"A clocked random-note generator: noise sampled on every beat, snapped to the major scale — a bright, always-in-key arp.",
		code: `const c = tempo(140)
sin()
  .pitch(noise().scale({ min: 48, max: 84 }).sah(c.beat).quantize())
  .mul(c.beat.ad(0.003, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — all params",
		description:
			"Every port set: snapped to A minor pentatonic, root 9 (A), window two octaves starting at octave 3 — a tight, rootsy random riff.",
		code: `const c = tempo(140)
sin()
  .pitch(noise().scale({ min: 36, max: 84 }).sah(c.beat).quantize({ scaleName: "minor pentatonic", root: 9, octave: 3, range: 2 }))
  .mul(c.beat.ad(0.003, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — root modulated (key change)",
		description:
			"Same random arp, but the root steps up a fourth on beat 3 of every bar — the whole riff modulates to a new key without ever leaving it.",
		code: `const c = tempo(140)
const key = p\`0 0 5 5\`.steps()
sin()
  .pitch(noise().scale({ min: 48, max: 84 }).sah(c.beat).quantize({ scaleName: "dorian", root: key }))
  .mul(c.beat.ad(0.003, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — range modulated (riser)",
		description:
			"The playable window opens from one octave to four over eight bars — the same random arp starts tight and spreads wide, a classic buildup.",
		code: `const c = tempo(140)
sin()
  .pitch(noise().scale({ min: 24, max: 96 }).sah(c.beat).quantize({ scaleName: "major pentatonic", range: lfo(0.02, 1, 4) }))
  .mul(c.beat.ad(0.003, 0.15))
  .gain(0.4)
  .out()`,
	},
	{
		section: "Utils",
		title: "quantize — showcase (generative bassline)",
		description:
			"A clocked random bassline over a blues scale, played through a filtered saw with a short decay — the idiom for a generative bass part that never leaves the key.",
		code: `const c = tempo(100)
const note = noise().scale({ min: 28, max: 52 }).sah(c.beat).quantize({ scaleName: "minor blues", root: 7, octave: 2, range: 2 })
note.saw()
  .lpf({ cutoff: note.add(24), res: 0.3 })
  .mul(c.beat.ad(0.002, 0.2))
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "scope — default",
		description:
			"A small waveform appears right after the call: a steady sine, held still by the scope's trigger. The signal passes through to the speakers unchanged.",
		code: `sin()
  .scope()
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "scope — all params",
		description:
			"A 50 ms sweep in a bigger widget, on a fixed -1..1 scale instead of the default fit.",
		code: `tri(57)
  .scope({ time: 0.05, width: 200, height: 60, min: -1, max: 1 })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "scope — time modulated",
		description: "The sweep length swings from 5 ms to 50 ms: the picture zooms in and out of the wave.",
		code: `tri()
  .scope({ time: lfo(0.2, 0.005, 0.05) })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "scope — showcase (probing a voice)",
		description:
			"One scope taps the oscillator mid-chain; a second, with no output of its own, draws the envelope and an LFO as two colored traces.",
		code: `tempo(120)
const s = seq("c3 e3 g3 <b2 a2>")
s.tri()
  .scope()
  .lpf({ cutoff: 81, res: 0.3 })
  .mul(s.gate.adsr(0.005, 0.12, 0.5, 0.2))
  .gain(0.3)
  .out()
scope({ env: s.gate.adsr(0.01, 0.1, 0.5, 0.2), lfo: lfo(0.5) })`,
	},
	{
		section: "Utils",
		title: "mix — poly lanes to mono",
		description:
			"A chord [c,e,g] is three poly lanes; mix sums them to one lane with 1/√3 scaling — the chord, folded down without clipping.",
		code: `tempo(90)
const s = seq("[c3,e3,g3]")
s.tri()
  .mix()
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "mix — showcase (chord to filter)",
		description:
			"A five-note stack mixed to mono, then a resonant lowpass sweep — mix is the summing point that lets one filter shape a whole chord.",
		code: `tempo(80)
const s = seq("[c3,e3,g3,b3,d4]")
s.tri()
  .mix()
  .lpf(lfo(0.2, 67, 102), 0.5)
  .mul(s.gate.adsr(0.02, 0.2, 0.7, 0.4))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "z1 — average with the last sample",
		description:
			"Each sample plus the previous — the highs cancel and the hiss dulls. The one-sample average is the smallest lowpass.",
		code: `const n = noise().gain(0.3)
n.add(n.z1())
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "z1 — difference from the last sample",
		description:
			"Each sample minus the previous — only change survives; the hiss thins and brightens. The unit delay is the atom digital filters are built from.",
		code: `const n = noise().gain(0.3)
n.sub(n.z1())
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "period — tuned delay (showcase)",
		description:
			"A short noise burst excites a delay tuned to C3 (period(48)) with heavy feedback — Karplus-Strong: the loop rings at the pitch instead of echoing as separate repeats.",
		code: `const c = tempo(100)
noise()
  .mul(c.beat.ad(0.001, 0.02))
  .delay({ time: period(48), feedback: 0.95, mix: 1 })
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "period — pitch modulated",
		description:
			"The same plucked string, but an LFO walks the tuning 48→60 semitones (C3→C4) — the ringing pitch glides up and down between hits.",
		code: `const c = tempo(100)
noise()
  .mul(c.beat.ad(0.001, 0.02))
  .delay({ time: period(lfo(0.2, 48, 60)), feedback: 0.95, mix: 1 })
  .gain(0.5)
  .out()`,
	},
	{
		section: "Utils",
		title: "out — the only thing that sounds",
		description:
			"Nothing plays until it reaches out; chains that never arrive are pruned. A mono input auto-centers.",
		code: `sin(hz(330))
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "out — poly spread (showcase)",
		description:
			"out places every in lane dead center; spread() fans the poly lanes across the stereo field at constant power before they reach it — a four-voice chord gets width.",
		code: `tempo(90)
const s = seq("[c2,g2,e3,b3]")
s.tri()
  .mul(s.gate.adsr(0.02, 0.1, 0.6, 0.2))
  .gain(0.5)
  .spread()
  .out()`,
	},
	{
		section: "Utils",
		title: "mixer — default",
		description:
			"Two named channels summed at their default level (1 each) — a sine and a triangle, equally loud.",
		code: `mixer({ a: sin({ pitch: hz(220) }), b: tri({ pitch: hz(222) }) })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "mixer — all params",
		description:
			".level sets each channel's own gain — here b is turned down to a quarter, so the triangle sits under the sine instead of beside it.",
		code: `mixer({ a: sin({ pitch: hz(220) }), b: tri({ pitch: hz(222) }) })
  .level({ a: 1, b: 0.25 })
  .gain(0.2)
  .out()`,
	},
	{
		section: "Utils",
		title: "mixer — level modulated",
		description:
			'.mod("level.a", lfo, depth) rides one channel\'s level up and down — the sine fades in and out while the triangle holds steady underneath.',
		code: `mixer({ a: sin({ pitch: hz(220) }), b: tri({ pitch: hz(222) }) })
  .level({ a: 0.5, b: 0.3 })
  .mod("level.a", lfo(0.2, -0.4, 0.4), 1)
  .gain(0.3)
  .out()`,
	},
	{
		section: "Utils",
		title: "mixer — showcase",
		description:
			"A drum bus and a bass bus summed into one mix, the bass turned down against the beat — the way a real mixer channel-strips a patch.",
		code: `const c = tempo(120)
const drums = c.beat.kick().gain(1)
const bass = seq("c1 c1 eb1 g0").tri().mul(seq("c1 c1 eb1 g0").gate.adsr(0.005, 0.1, 0.6, 0.15))
mixer({ drums, bass })
  .level({ bass: 0.5 })
  .gain(0.3)
  .out()`,
	},
];
