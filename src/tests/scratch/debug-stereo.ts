import { device } from '../../descriptor/device';
import { resetIdCounter } from '../../descriptor/identity';
import { inputs } from '../../descriptor/inputs';
import { isPoly, poly } from '../../descriptor/poly';
import { clearRegistry } from '../../descriptor/registry';
import { isDescriptor } from '../../descriptor/guards/is-descriptor';

// Reset state
resetIdCounter();
clearRegistry();

// Simple oscillator that outputs its pitch value directly (for testing)
const testOsc = device("testOsc", {
	inputs: inputs({ pitch: 440 }),
	outputs: ["out"] as const,
	defaultInput: "pitch" as const,
	defaultOutput: "out" as const,
	process: (inp) => ({ out: inp.pitch as number }),
});

const osc1 = testOsc(100);
const osc2 = testOsc(200);
const osc3 = testOsc(300);

console.log('osc1 isDescriptor:', isDescriptor(osc1));
console.log('osc1 _state.inputBindings:', osc1._state.inputBindings);

console.log('osc2 isDescriptor:', isDescriptor(osc2));
console.log('osc2 _state.inputBindings:', osc2._state.inputBindings);

console.log('osc3 isDescriptor:', isDescriptor(osc3));
console.log('osc3 _state.inputBindings:', osc3._state.inputBindings);

const p = poly([osc1, osc2, osc3]);
console.log('poly isPoly:', isPoly(p));
console.log('poly voices count:', p.voices.length);
