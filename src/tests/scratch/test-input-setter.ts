import "../../core2/api";
import { clock } from "../../core2/devices/clock";

// Test 1: uncalled chain method used as signal
console.log("Test 1: s.gain (uncalled chain method)");
try {
	clock(120)
		.seq("<c4_e4 e4_g4>")
		.apply((s) => s.sin().vca(s.gain).gain(0.5).out());
	console.log("ERROR: Should have thrown!");
} catch (e) {
	console.log("OK:", (e as Error).message);
}

// Test 2: input setter used as signal (on a device that has the input)
console.log("\nTest 2: s.freq (input setter on sin)");
try {
	clock(120)
		.seq("<c4_e4 e4_g4>")
		.apply((s) => {
			const osc = s.sin();
			return osc.vca(osc.freq).out(); // freq is an input setter on sin
		});
	console.log("ERROR: Should have thrown!");
} catch (e) {
	console.log("OK:", (e as Error).message);
}
