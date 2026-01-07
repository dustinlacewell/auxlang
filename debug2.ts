import { tokenize } from "./src/devices/seq/tokenize";

// Tokenize and print for debugging
const tokens = tokenize("[c4 [e4 [g4 b4]]]");
console.log("Tokens:");
tokens.forEach((t, i) => console.log(`  ${i}: ${t.type} "${t.value}"`));
