import type { Example } from "@/ui/editor/examples/example";

/** Two oscillators frequency-modulate each other through `loop`. */
const crossFm = `loop({ a: 0, b: 0 }, (fb) => ({
  a: sin(57).mod("pitch", fb.b, lfo(0.1, 2, 14)),
  b: sin(64).mod("pitch", fb.a, 12),
})).apply((v) => v.a.add(v.b).gain(0.2).out())
`;

export const crossFmExample: Example = { name: "cross FM", source: crossFm };
