/**
 * Test VoiceRef functionality
 */

import { reset } from "@/core2/eval/reset";
import * as api from "@/core2/api";
import { getBuilder } from "@/core2/graph/graph-builder";

function runTest(name: string, fn: () => void) {
	reset();
	console.log(`\n=== ${name} ===`);
	try {
		fn();
		const nodes = getBuilder().getNodes();
		console.log("Nodes:", nodes.map((n) => `${n.id}:${n.device}`).join(", "));
		console.log("PASS");
	} catch (e) {
		console.log("FAIL:", e);
	}
}

// Test 1: Basic chaining
runTest("Test 1: Basic chaining", () => {
	const s = api.clock(120).seq("{c4,e4,g4}") as any;
	s.voices[0].saw().gain(0.3).out();
});

// Test 2: .apply() method
runTest("Test 2: .apply() method", () => {
	const s = api.clock(120).seq("{c4,e4,g4}") as any;
	s.voices[0].apply((v: any) => v.saw().gain(0.3).out());
});

// Test 3: .out() on VoiceRef directly
runTest("Test 3: .out() directly on VoiceRef", () => {
	const s = api.clock(120).seq("{c4,e4,g4}") as any;
	s.voices[0].out();
});

// Test 4: Output access (.gate)
runTest("Test 4: Output access .gate", () => {
	const s = api.clock(120).seq("{c4,e4,g4}") as any;
	s.voices[0].gate.ar().out();
});

// Test 5: VoiceRef as signal param
runTest("Test 5: VoiceRef as signal param", () => {
	const s = api.clock(120).seq("{c4,e4,g4}") as any;
	const voice = s.voices[0];
	api.saw(220).gain({ level: voice.gate.ar() }).out();
});

// Test 6: Storing VoiceRef in variable and chaining
runTest("Test 6: VoiceRef in variable then chain", () => {
	const s = api.clock(120).seq("{c4,e4,g4}") as any;
	const v = s.voices[0];
	v.saw().gain(0.3).out();
});

// Test 7: Multiple voices with apply
runTest("Test 7: Multiple voices with apply", () => {
	const s = api.clock(120).seq("{c3,g3}") as any;
	s.voices[0].apply((v: any) => v.saw().lpf(400).gain({ level: v.gate.ar() }).out());
	s.voices[1].apply((v: any) => v.tri().lpf(800).gain({ level: v.gate.ar() }).out());
});

// Test 8: .trig output chaining
runTest("Test 8: .trig output chaining", () => {
	const s = api.clock(120).seq("{c4,~,g4}") as any;
	s.voices[0].trig.kick().out();
});

// Test 9: VoiceRef gate used with adsr
runTest("Test 9: VoiceRef gate with adsr", () => {
	const s = api.clock(120).seq("{c4,e4,g4}") as any;
	s.voices[0]
		.saw()
		.gain({ level: s.voices[0].gate.adsr({ attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.3 }) })
		.out();
});

console.log("\n=== All tests complete ===");
