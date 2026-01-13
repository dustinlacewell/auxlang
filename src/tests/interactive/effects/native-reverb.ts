/**
 * nativeReverb - WASM Freeverb reverb
 *
 * Inputs:
 *   input: audio signal
 *   room: room size 0-1 (default: 0.5)
 *   damp: damping 0-1 (default: 0.5)
 *   wet: wet level 0-1 (default: 0.33)
 *   dry: dry level 0-1 (default: 0.7)
 *
 * Outputs:
 *   audio: processed signal
 */

import type { TestDefinition } from "../types";

// Default: nativeReverb with spec defaults
export const nativeReverbDefault: TestDefinition = {
	id: "native-reverb-default",
	category: "Effects",
	name: "nativeReverb - defaults",
	desc: "WASM reverb with default settings",
	code: `clock(60).seq("c3 ~ e3 ~").apply(s =>
  s.saw()
    .gain({ level: s.gate.adsr() })
    .nativeReverb()
    .gain(0.3)
    .out()
)`,
};

// All params: explicit room, damp, wet, dry
export const nativeReverbAllParams: TestDefinition = {
	id: "native-reverb-all-params",
	category: "Effects",
	name: "nativeReverb - all params",
	desc: "Large room with high damping",
	code: `clock(60).seq("c3 ~ e3 ~").apply(s =>
  s.saw()
    .gain({ level: s.gate.adsr() })
    .nativeReverb({ room: 0.9, damp: 0.7, wet: 0.5, dry: 0.5 })
    .gain(0.3)
    .out()
)`,
};

// Modulated room
export const nativeReverbModRoom: TestDefinition = {
	id: "native-reverb-mod-room",
	category: "Effects",
	name: "nativeReverb - modulated room",
	desc: "Room size swept by LFO",
	code: `clock(60).seq("c3 ~ e3 ~").apply(s =>
  s.saw()
    .gain({ level: s.gate.adsr() })
    .nativeReverb({ room: sin(0.1, 0.3, 0.9), damp: 0.5, wet: 0.4, dry: 0.6 })
    .gain(0.3)
    .out()
)`,
};

// Modulated damp
export const nativeReverbModDamp: TestDefinition = {
	id: "native-reverb-mod-damp",
	category: "Effects",
	name: "nativeReverb - modulated damp",
	desc: "Damping swept by LFO",
	code: `clock(60).seq("c3 ~ e3 ~").apply(s =>
  s.saw()
    .gain({ level: s.gate.adsr() })
    .nativeReverb({ room: 0.7, damp: sin(0.15, 0.2, 0.8), wet: 0.4, dry: 0.6 })
    .gain(0.3)
    .out()
)`,
};

// Modulated wet
export const nativeReverbModWet: TestDefinition = {
	id: "native-reverb-mod-wet",
	category: "Effects",
	name: "nativeReverb - modulated wet",
	desc: "Wet level swept by LFO",
	code: `clock(60).seq("c3 ~ e3 ~").apply(s =>
  s.saw()
    .gain({ level: s.gate.adsr() })
    .nativeReverb({ room: 0.7, damp: 0.5, wet: sin(0.2, 0.1, 0.6), dry: 0.7 })
    .gain(0.3)
    .out()
)`,
};

// Modulated dry
export const nativeReverbModDry: TestDefinition = {
	id: "native-reverb-mod-dry",
	category: "Effects",
	name: "nativeReverb - modulated dry",
	desc: "Dry level swept by LFO",
	code: `clock(60).seq("c3 ~ e3 ~").apply(s =>
  s.saw()
    .gain({ level: s.gate.adsr() })
    .nativeReverb({ room: 0.7, damp: 0.5, wet: 0.4, dry: sin(0.2, 0.3, 0.9) })
    .gain(0.3)
    .out()
)`,
};

// Showcase: lush pad with reverb
export const nativeReverbShowcase: TestDefinition = {
	id: "native-reverb-showcase",
	category: "Effects",
	name: "nativeReverb - showcase",
	desc: "Ambient pad with lush reverb",
	code: `clock(40).seq("{c3,e3,g3} {d3,f3,a3}").apply(s =>
  s.tri()
    .lpf(sin(0.05, 400, 1200), 0.1)
    .gain({ level: s.gate.adsr({ attack: 0.3, decay: 0.2, sustain: 0.6, release: 1.0 }) })
    .nativeReverb({ room: 0.85, damp: 0.4, wet: 0.6, dry: 0.4 })
    .gain(0.25)
    .out()
)`,
};

export const nativeReverbTests = [
	nativeReverbDefault,
	nativeReverbAllParams,
	nativeReverbModRoom,
	nativeReverbModDamp,
	nativeReverbModWet,
	nativeReverbModDry,
	nativeReverbShowcase,
];
