import { device, gain, saw } from "../../editor/api";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";

// Create an alias with level bound (not input)
// gain().level(0.2) sets the level input explicitly
const templateGain = gain().level(0.2);
console.log("template gain inputBindings:", templateGain._state.inputBindings);

const shh = device("shh", templateGain);

console.log("shh is descriptor:", isDescriptor(shh));
console.log("shh._state.spec.defaultInput:", shh._state.spec.defaultInput);
console.log("shh._state.spec.defaultOutput:", shh._state.spec.defaultOutput);

// Test chaining
const sawDesc = saw(440) as any;
const result = sawDesc.shh();
console.log("\nsaw(440).shh():");
console.log("  is descriptor:", isDescriptor(result));
console.log("  inputBindings:", result._state.inputBindings);

// Test override via positional (first positional after chained input is 'level')
const override = sawDesc.shh(0.5);
console.log("\nsaw(440).shh(0.5):");
console.log("  inputBindings:", override._state.inputBindings);

// Test override via object params
const override2 = sawDesc.shh({ level: 0.8 });
console.log("\nsaw(440).shh({ level: 0.8 }):");
console.log("  inputBindings:", override2._state.inputBindings);

console.log("\nSUCCESS!");
