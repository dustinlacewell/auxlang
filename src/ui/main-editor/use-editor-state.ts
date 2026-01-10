import type { PlaybackState } from "@/ui/audio/types";
import { useAudioPlayer } from "@/ui/audio/use-audio-player";
import { useCallback, useState } from "react";

const DEFAULT_CODE = `// "coastline" inspired - downtempo, Bbm9/Fm9
// Original by @eddyflux - this is our interpretation
let clk = clock(90)

// === DRUMS ===
// Kick: basic four-on-floor with occasional double
let kickSeq = seq("c1*<1 2> [~ ~ ~ c1]").trig(clk.trig)
let kck = kick(kickSeq.gate).pitch(45).decay(0.4).sweep(3)

// Rimshot + snare on 2 and 4
let rimSeq = seq("~ c1 ~ c1").trig(clk.trig)
let rim = snare(rimSeq.gate).tone(0.7).decay(0.08).snappy(0.3)

// Hats: varied subdivision
let hatSeq = seq("[c1 <c1 c1 c1>]*<2 2 2 4>").trig(clk.trig)
let hh = gain(hihat(hatSeq.gate).decay(0.03).tone(0.6)).level(0.4)

// === CHORDS (Bbm9 → Fm9, alternating every 4 steps) ===
let chordSeq = seq("<bb2 f2>@4").trig(clk.trig)
let ch1 = saw(chordSeq.cv)
let ch2 = saw(mult(chordSeq.cv).b(1.189))  // minor 3rd up
let ch3 = saw(mult(chordSeq.cv).b(1.498))  // 5th up
let ch4 = saw(mult(chordSeq.cv).b(1.782))  // minor 7th up
let chordMix = mix(ch1).b(ch2).c(ch3).d(ch4)
let chordEnv = adsr(chordSeq.gate).attack(0.1).decay(0.3).sustain(0.5).release(0.8)
let chordFilt = lpf(chordMix).cutoff(800).resonance(0.15)
let chords = mult(chordFilt).b(chordEnv.out)

// === BASS (root motion: Bb → F) ===
let bassSeq = seq("<bb1 f1>@4").trig(clk.trig)
let bassOsc = saw(bassSeq.cv)
let bassEnv = adsr(bassSeq.gate).attack(0.01).decay(0.2).sustain(0.6).release(0.3)
let bassFilt = lpf(bassOsc).cutoff(300).resonance(0.2)
let bass = mult(bassFilt).b(bassEnv.out)

// === MELODY (arpeggiated chord tones with euclidean) ===
let melSeq = seq("<[bb4 f4] [db5 ab4]>(3,8)").trig(clk.trig)
let melOsc = saw(melSeq.cv)
let melEnv = adsr(melSeq.gate).attack(0.01).decay(0.15).sustain(0.2).release(0.3)
let melCut = lfo(0.125).min(600).max(1500)
let melFilt = lpf(melOsc).cutoff(melCut).resonance(0.4)
let melDry = mult(melFilt).b(melEnv.out)
let melody = delay(melDry).time(0.333).feedback(0.3).mix(0.4)

// === MIX ===
let drums = mix(gain(kck).level(0.7)).b(gain(rim).level(0.4)).c(hh)
let synths = mix(gain(bass).level(0.5)).b(gain(chords).level(0.35)).c(gain(melody).level(0.25))
let master = mix(drums).b(synths)

return out(gain(master).level(0.65))`;

interface EditorState {
	code: string;
	setCode: (code: string) => void;
	state: PlaybackState;
	error: string | null;
	run: () => Promise<void>;
	stop: () => void;
}

export function useEditorState(defaultCode: string = DEFAULT_CODE): EditorState {
	const [code, setCode] = useState(defaultCode);
	const { state, error, play, stop } = useAudioPlayer();

	const run = useCallback(async () => {
		await play(code);
	}, [code, play]);

	return { code, setCode, state, error, run, stop };
}
