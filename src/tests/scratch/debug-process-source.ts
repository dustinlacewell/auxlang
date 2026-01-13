import { getDeviceSpec } from "../../core2/device/registry";

// Import devices to register them
import "../../core2/devices/quantize";
import "../../core2/devices/sah";
import "../../core2/devices/ar";
import "../../core2/devices/scale";
import "../../core2/devices/noise";
import "../../core2/devices/clock";
import "../../core2/devices/seq/seq";
import "../../core2/devices/tri";
import "../../core2/devices/gain";
import "../../core2/devices/out";

const devices = ["quantize", "sah", "ar", "scale", "noise", "clock", "seq", "tri", "gain", "out"];

for (const name of devices) {
  const spec = getDeviceSpec(name);
  if (spec) {
    const source = spec.process.toString();
    console.log(`\n=== ${name} ===`);
    console.log(`First 200 chars: ${source.slice(0, 200)}`);

    // Try to hydrate it
    try {
      let normalized = source;
      if (/^\w+\s*\(/.test(source) && !source.startsWith("function") && !source.includes("=>")) {
        normalized = `function ${source}`;
      }
      const fn = new Function(`return (${normalized})`)();
      console.log("Hydration: OK");
    } catch (e) {
      console.log(`Hydration ERROR: ${e}`);
    }
  }
}
