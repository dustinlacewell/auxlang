export interface TestDefinition {
	id: string;
	category: string;
	name: string;
	desc: string;
	code: string;
}

export const tests: TestDefinition[] = [
	// === OSCILLATORS ===
	{
		id: "osc-sine",
		category: "Oscillators",
		name: "osc (sine)",
		desc: "Pure sine wave at 440Hz - smooth, no harmonics",
		code: `return out(gain(osc(440)).amount(0.3))`,
	},
	{
		id: "osc-saw",
		category: "Oscillators",
		name: "saw",
		desc: "Sawtooth wave at 220Hz - bright, buzzy",
		code: `return out(gain(saw(220)).amount(0.2))`,
	},
	{
		id: "osc-sqr",
		category: "Oscillators",
		name: "sqr",
		desc: "Square wave at 330Hz - hollow, clarinet-like",
		code: `return out(gain(sqr(330)).amount(0.2))`,
	},
	{
		id: "osc-tri",
		category: "Oscillators",
		name: "tri",
		desc: "Triangle wave at 440Hz - soft, flute-like",
		code: `return out(gain(tri(440)).amount(0.3))`,
	},
	{
		id: "osc-noise",
		category: "Oscillators",
		name: "noise",
		desc: "White noise - hissy, all frequencies",
		code: `return out(gain(noise()).amount(0.15))`,
	},
	{
		id: "osc-lfo-pitch",
		category: "Oscillators",
		name: "lfo → pitch",
		desc: "Sine with vibrato - pitch should wobble",
		code: `let freq = add(440).b(mult(lfo(5)).b(20))
return out(gain(osc(freq)).amount(0.3))`,
	},

	// === DRUMS ===
	{
		id: "drums-kick",
		category: "Drums",
		name: "kick",
		desc: "808-style kick drum - deep thump",
		code: `let clk = clock(120)
let seq1 = seq("c1 c1 c1 c1").trig(clk.trig)
return out(kick(seq1.gate).pitch(50).decay(0.3).sweep(3))`,
	},
	{
		id: "drums-snare",
		category: "Drums",
		name: "snare",
		desc: "808-style snare - punchy with noise",
		code: `let clk = clock(120)
let seq1 = seq("~ c1 ~ c1").trig(clk.trig)
return out(snare(seq1.gate).tone(0.5).decay(0.15).snappy(0.5))`,
	},
	{
		id: "drums-hihat",
		category: "Drums",
		name: "hihat",
		desc: "808-style hihat - metallic tick",
		code: `let clk = clock(120)
let seq1 = seq("c1 c1 c1 c1 c1 c1 c1 c1").trig(clk.trig)
return out(gain(hihat(seq1.gate).decay(0.05).tone(0.7)).amount(0.5))`,
	},
	{
		id: "drums-clap",
		category: "Drums",
		name: "clap",
		desc: "808-style clap - layered snappy sound",
		code: `let clk = clock(120)
let seq1 = seq("~ c1 ~ c1").trig(clk.trig)
return out(clap(seq1.gate).decay(0.2))`,
	},
	{
		id: "drums-kit",
		category: "Drums",
		name: "drum kit combined",
		desc: "All drums together - full beat",
		code: `let clk = clock(120)
let k = seq("c1 ~ ~ c1 c1 ~ ~ ~").trig(clk.trig)
let s = seq("~ ~ c1 ~ ~ ~ c1 ~").trig(clk.trig)
let h = seq("c1 c1 c1 c1 c1 c1 c1 c1").trig(clk.trig)
let drums = mix(kick(k.gate)).b(snare(s.gate)).c(gain(hihat(h.gate).decay(0.04)).amount(0.3))
return out(gain(drums).amount(0.7))`,
	},

	// === SEQUENCING ===
	{
		id: "seq-basic",
		category: "Sequencing",
		name: "seq - basic notes",
		desc: "C major arpeggio - should hear c4 e4 g4 c5",
		code: `let clk = clock(120)
let s = seq("c4 e4 g4 c5").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).b(env1.out))`,
	},
	{
		id: "seq-rests",
		category: "Sequencing",
		name: "seq - rests (~)",
		desc: "Notes with gaps - c4 _ e4 _",
		code: `let clk = clock(120)
let s = seq("c4 ~ e4 ~").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.5).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).b(env1.out))`,
	},
	{
		id: "seq-groups",
		category: "Sequencing",
		name: "seq - groups []",
		desc: "Subdivided notes - [c4 e4] plays twice as fast",
		code: `let clk = clock(120)
let s = seq("c4 [e4 g4] c5 [g4 e4]").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.005).decay(0.08).sustain(0.3).release(0.05)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).b(env1.out))`,
	},
	{
		id: "seq-multiply",
		category: "Sequencing",
		name: "seq - multiply (*)",
		desc: "c4*4 = four c4s in one slot (fast repeat)",
		code: `let clk = clock(90)
let s = seq("c4*4 e4 g4*2 c5").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.005).decay(0.05).sustain(0.3).release(0.02)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).b(env1.out))`,
	},
	{
		id: "seq-replicate",
		category: "Sequencing",
		name: "seq - replicate (!)",
		desc: "c4!3 = three c4s taking 3 slots",
		code: `let clk = clock(120)
let s = seq("c4!3 g4").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.5).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).b(env1.out))`,
	},
	{
		id: "seq-elongate",
		category: "Sequencing",
		name: "seq - elongate (@)",
		desc: "c4@3 = c4 held for 3 slots",
		code: `let clk = clock(120)
let s = seq("c4@3 g4").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.7).release(0.3)
return out(mult(lpf(saw(s.cv)).cutoff(1200)).b(env1.out))`,
	},
	{
		id: "seq-alternation",
		category: "Sequencing",
		name: "seq - alternation (<>)",
		desc: "c4 c4 <c4 e4 g4> cycles each loop",
		code: `let clk = clock(180)
let s = seq("c4 c4 <c4 e4 g4>").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.4).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1500)).b(env1.out))`,
	},
	{
		id: "seq-euclidean",
		category: "Sequencing",
		name: "seq - euclidean (k,n)",
		desc: "c4(3,8) = 3 hits spread over 8 steps",
		code: `let clk = clock(140)
let s = seq("c4(3,8)").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(2000)).b(env1.out))`,
	},
	{
		id: "seq-sharps-flats",
		category: "Sequencing",
		name: "seq - sharps/flats",
		desc: "c#4 db4 f#4 gb4 - chromatic",
		code: `let clk = clock(120)
let s = seq("c#4 db4 f#4 gb4").trig(clk.trig)
let env1 = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.4).release(0.1)
return out(mult(lpf(saw(s.cv)).cutoff(1800)).b(env1.out))`,
	},
	{
		id: "seq-glide",
		category: "Sequencing",
		name: "seq - glide (_)",
		desc: "c3_g3 ~ e3_c4 - legato phrases with gap",
		code: `let clk = clock(120)
let s = seq("c3_g3 ~ e3_c4").trig(clk.trig)
let smoothPitch = slew(s.cv).rise(0.01).fall(0)
let e = adsr(s.gate).attack(0.5).decay(0.1).sustain(0.35).release(0.05)
return out(mult(lpf(saw(smoothPitch)).cutoff(1200)).b(e.out))`,
	},

	// === ENVELOPES ===
	{
		id: "env-ar",
		category: "Envelopes",
		name: "env (AR)",
		desc: "Attack-Release envelope - ramp up, ramp down",
		code: `let clk = clock(60)
let s = seq("c4 ~ ~ ~").trig(clk.trig)
let e = env(s.gate).attack(0.3).release(0.5)
return out(mult(osc(s.cv)).b(e.out))`,
	},
	{
		id: "env-plucky",
		category: "Envelopes",
		name: "adsr - plucky",
		desc: "Fast attack, short decay - plucky sound",
		code: `let clk = clock(120)
let s = seq("c4 e4 g4 c5").trig(clk.trig)
let e = adsr(s.gate).attack(0.005).decay(0.1).sustain(0.1).release(0.05)
return out(mult(saw(s.cv)).b(e.out))`,
	},
	{
		id: "env-pad",
		category: "Envelopes",
		name: "adsr - pad",
		desc: "Slow attack, high sustain - pad sound",
		code: `let clk = clock(40)
let s = seq("c3 g3").trig(clk.trig)
let e = adsr(s.gate).attack(0.4).decay(0.3).sustain(0.7).release(0.5)
return out(gain(mult(lpf(saw(s.cv)).cutoff(800)).b(e.out)).amount(0.5))`,
	},

	// === FILTERS ===
	{
		id: "lpf-static",
		category: "Filters",
		name: "lpf - static",
		desc: "Low-pass at 500Hz - muffled saw",
		code: `return out(gain(lpf(saw(220)).cutoff(500)).amount(0.3))`,
	},
	{
		id: "lpf-resonant",
		category: "Filters",
		name: "lpf - resonant",
		desc: "High resonance - whistly peak",
		code: `return out(gain(lpf(saw(110)).cutoff(800).resonance(0.8)).amount(0.2))`,
	},
	{
		id: "lpf-modulated",
		category: "Filters",
		name: "lpf - modulated",
		desc: "LFO on cutoff - wah-wah effect",
		code: `let cut = lfo(2).min(300).max(2000)
return out(gain(lpf(saw(110)).cutoff(cut).resonance(0.4)).amount(0.25))`,
	},
	{
		id: "hpf-static",
		category: "Filters",
		name: "hpf - static",
		desc: "High-pass at 1000Hz - thin, trebly",
		code: `return out(gain(hpf(saw(110)).cutoff(1000)).amount(0.3))`,
	},

	// === EFFECTS ===
	{
		id: "delay-echo",
		category: "Effects",
		name: "delay - echo",
		desc: "Delay with feedback - repeating echoes",
		code: `let clk = clock(120)
let s = seq("c4 ~ ~ ~ e4 ~ ~ ~").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.2).release(0.1)
let dry = mult(lpf(saw(s.cv)).cutoff(1500)).b(e.out)
return out(delay(dry).time(0.25).feedback(0.5).mix(0.4))`,
	},

	// === UTILITIES ===
	{
		id: "util-mix",
		category: "Utilities",
		name: "mix - 4 channel",
		desc: "Four detuned saws - thick unison",
		code: `let f = 220
let s1 = saw(f)
let s2 = saw(mult(f).b(1.005))
let s3 = saw(mult(f).b(0.995))
let s4 = saw(mult(f).b(1.01))
return out(gain(lpf(mix(s1).b(s2).c(s3).d(s4)).cutoff(1200)).amount(0.15))`,
	},
	{
		id: "util-slew",
		category: "Utilities",
		name: "slew - portamento",
		desc: "Glide between notes - smooth pitch change",
		code: `let clk = clock(60)
let s = seq("c3 g3 e3 c4").trig(clk.trig)
let smoothPitch = slew(s.cv).rise(0.1).fall(0.1)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.6).release(0.2)
return out(mult(lpf(saw(smoothPitch)).cutoff(1000)).b(e.out))`,
	},
	{
		id: "util-gain",
		category: "Utilities",
		name: "gain",
		desc: "Volume control - quiet sine",
		code: `return out(gain(osc(440)).amount(0.1))`,
	},

	// === MATH ===
	{
		id: "math-ring-mod",
		category: "Math",
		name: "mult - ring mod",
		desc: "Two oscs multiplied - metallic sound",
		code: `return out(gain(mult(osc(440)).b(osc(110))).amount(0.3))`,
	},
	{
		id: "math-add",
		category: "Math",
		name: "add - mix signals",
		desc: "Two oscs added - chord",
		code: `return out(gain(add(osc(440)).b(osc(550))).amount(0.2))`,
	},

	// === CLOCK/TIMING ===
	{
		id: "clock-60",
		category: "Clock",
		name: "clock - 60 BPM",
		desc: "Slow tempo - one beat per second",
		code: `let clk = clock(60)
let s = seq("c4").trig(clk.trig)
return out(kick(s.gate))`,
	},
	{
		id: "clock-140",
		category: "Clock",
		name: "clock - 140 BPM",
		desc: "Fast tempo - energetic",
		code: `let clk = clock(140)
let s = seq("c4").trig(clk.trig)
return out(kick(s.gate))`,
	},
	{
		id: "clock-div",
		category: "Clock",
		name: "clockDiv",
		desc: "Divide clock by 4 - one hit per bar",
		code: `let clk = clock(120)
let bar = clockDiv(clk.trig, 4)
return out(kick(bar.trig).pitch(40).decay(0.5))`,
	},
	{
		id: "clock-counter",
		category: "Clock",
		name: "counter",
		desc: "Count beats, modulo 4 - pitch changes each beat",
		code: `let clk = clock(120)
let s = seq("c4").trig(clk.trig)
let cnt = counter(clk.trig).max(4)
let pitch = add(s.cv).b(mult(cnt.count).b(50))
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(lpf(saw(pitch)).cutoff(1500)).b(e.out))`,
	},

	// === LOGIC (for arrangement) ===
	{
		id: "logic-gte",
		category: "Logic",
		name: "gte - gate drums",
		desc: "Drums start after beat 4",
		code: `let clk = clock(120)
let cnt = counter(clk.trig).max(8)
let drumsOn = gte(cnt.count).b(4)
let s = seq("c1").trig(clk.trig)
return out(mult(kick(s.gate)).b(drumsOn))`,
	},
	{
		id: "logic-lt",
		category: "Logic",
		name: "lt - intro only",
		desc: "Sound only in first 4 beats",
		code: `let clk = clock(120)
let cnt = counter(clk.trig).max(8)
let introOn = lt(cnt.count).b(4)
let s = seq("c4 e4 g4 c5").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.1).sustain(0.3).release(0.1)
return out(mult(mult(saw(s.cv)).b(e.out)).b(introOn))`,
	},
	{
		id: "logic-and",
		category: "Logic",
		name: "and - range gate",
		desc: "Sound only in beats 2-5",
		code: `let clk = clock(120)
let cnt = counter(clk.trig).max(8)
let inRange = and(gte(cnt.count).b(2)).b(lt(cnt.count).b(6))
let s = seq("c4").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.4).release(0.1)
return out(mult(mult(saw(s.cv)).b(e.out)).b(inRange))`,
	},

	// === POLYPHONY ===
	{
		id: "poly-chord-static",
		category: "Polyphony",
		name: "static chord (3 voices)",
		desc: "C major triad - 3 saws playing simultaneously",
		code: `// Three pitches as array input = 3 poly channels
let chord = saw([261.63, 329.63, 392.00])  // C4, E4, G4
return out(gain(lpf(chord).cutoff(1500)).amount(0.15))`,
	},
	{
		id: "poly-chord-7th",
		category: "Polyphony",
		name: "static chord (4 voices)",
		desc: "C major 7th - 4 voices summed to mono",
		code: `// Four pitches = 4 poly channels, auto-summed at output
let chord = saw([261.63, 329.63, 392.00, 493.88])  // C4, E4, G4, B4
return out(gain(lpf(chord).cutoff(1200)).amount(0.12))`,
	},
	{
		id: "poly-unison-detune",
		category: "Polyphony",
		name: "detuned unison (4 voices)",
		desc: "4 slightly detuned saws - thick supersaw",
		code: `// Detuned frequencies for thick unison
let f = 220
let chord = saw([f * 0.995, f, f * 1.005, f * 1.01])
return out(gain(lpf(chord).cutoff(2000)).amount(0.12))`,
	},
	{
		id: "poly-broadcast-filter",
		category: "Polyphony",
		name: "mono cutoff → poly signal",
		desc: "Single LFO controls filter on all 3 voices",
		code: `// Poly signal + mono modulation = mono broadcasts to all channels
let chord = saw([261.63, 329.63, 392.00])
let cut = lfo(0.5).min(400).max(2000)  // mono LFO
return out(gain(lpf(chord).cutoff(cut)).amount(0.15))`,
	},
	{
		id: "poly-per-voice-state",
		category: "Polyphony",
		name: "independent oscillator phases",
		desc: "Each voice has its own phase - no phase lock",
		code: `// Each channel gets independent state (phase)
// You should hear a full chord, not a single tone
let chord = osc([261.63, 329.63, 392.00])
return out(gain(chord).amount(0.2))`,
	},
	{
		id: "poly-sequenced-chord",
		category: "Polyphony",
		name: "sequenced poly voices",
		desc: "Gate triggers 3-voice chord - plucky stabs",
		code: `let clk = clock(120)
let s = seq("c4 ~ c4 c4 ~ c4 ~ ~").trig(clk.trig)
// Use the seq gate to trigger a chord (poly pitch, mono gate broadcasts)
let chord = saw([261.63, 329.63, 392.00])
let e = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.2).release(0.1)
return out(gain(mult(lpf(chord).cutoff(1500)).b(e.out)).amount(0.15))`,
	},
	{
		id: "poly-stacked-fifths",
		category: "Polyphony",
		name: "stacked fifths (5 voices)",
		desc: "Power chord stack - heavy!",
		code: `// A1, E2, A2, E3, A3 - stacked fifths
let chord = saw([55, 82.41, 110, 164.81, 220])
return out(gain(lpf(chord).cutoff(800).resonance(0.3)).amount(0.1))`,
	},
	{
		id: "poly-noise-chord",
		category: "Polyphony",
		name: "filtered noise chord",
		desc: "3 bandpass-filtered noise - eerie chord",
		code: `// Each noise channel filtered at different freq
// (This works because each channel has independent filter state)
let n = noise()
let cut = [400, 600, 800]  // poly cutoff = different filter per channel
return out(gain(lpf(n).cutoff(cut).resonance(0.9)).amount(0.2))`,
	},
	{
		id: "poly-seq-chord",
		category: "Polyphony",
		name: "sequenced chords (comma syntax)",
		desc: "c4,e4,g4 = C major triad in mini-notation",
		code: `let clk = clock(120)
let s = seq("c4,e4,g4 ~ f4,a4,c5 ~").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.3).release(0.2)
return out(gain(mult(lpf(saw(s.cv)).cutoff(1200)).b(e.out)).amount(0.12))`,
	},
	{
		id: "poly-seq-mixed",
		category: "Polyphony",
		name: "mixed mono/poly sequence",
		desc: "Bass note followed by chord stabs",
		code: `let clk = clock(120)
let s = seq("c2 c4,e4,g4 c2 g3,b3,d4").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.15).sustain(0.2).release(0.1)
return out(gain(mult(lpf(saw(s.cv)).cutoff(1000)).b(e.out)).amount(0.15))`,
	},
	{
		id: "poly-unison-param",
		category: "Polyphony",
		name: ".poly(4).detune(15)",
		desc: "Supersaw via poly/detune params - thick and wide",
		code: `let clk = clock(120)
let s = seq("c3 g3 c3 eb3").trig(clk.trig)
let e = adsr(s.gate).attack(0.01).decay(0.2).sustain(0.3).release(0.2)
let voice = sawOsc(s.cv).poly(4).detune(15)
return out(gain(mult(lpf(voice).cutoff(1500)).b(e.out)).amount(0.12))`,
	},
	{
		id: "poly-unison-7",
		category: "Polyphony",
		name: ".poly(7).detune(25)",
		desc: "7-voice supersaw - massive unison",
		code: `let voice = sawOsc(110).poly(7).detune(25)
return out(gain(lpf(voice).cutoff(2000)).amount(0.08))`,
	},
	{
		id: "poly-unison-subtle",
		category: "Polyphony",
		name: ".poly(2).detune(5)",
		desc: "Subtle 2-voice chorus - gentle widening",
		code: `let clk = clock(90)
let s = seq("c4 e4 g4 c5").trig(clk.trig)
let e = adsr(s.gate).attack(0.1).decay(0.3).sustain(0.6).release(0.3)
let voice = osc(s.cv).poly(2).detune(5)
return out(gain(mult(voice).b(e.out)).amount(0.2))`,
	},
];

export function getTestsByCategory(): Map<string, TestDefinition[]> {
	const byCategory = new Map<string, TestDefinition[]>();
	for (const test of tests) {
		const existing = byCategory.get(test.category);
		if (existing) {
			existing.push(test);
		} else {
			byCategory.set(test.category, [test]);
		}
	}
	return byCategory;
}
