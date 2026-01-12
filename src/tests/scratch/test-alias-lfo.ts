import { device, gain, saw, lfo } from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";

// Create alias with LFO level
const templateGain = gain(lfo(0.5));
console.log("template gain inputBindings:", templateGain._state.inputBindings);

const shh = device("shh", templateGain);
console.log("shh._state.inputBindings:", shh._state.inputBindings);

// Test chaining
const sawDesc = saw(440) as any;
const result = sawDesc.shh();
console.log("\nsaw(440).shh():");
console.log("  inputBindings:", result._state.inputBindings);

// Check if level binding has the LFO reference
const levelBinding = result._state.inputBindings.level;
console.log("  level binding type:", typeof levelBinding);
console.log("  level binding:", levelBinding);
