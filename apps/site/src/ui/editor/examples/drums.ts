import type { Example } from "@/ui/editor/examples/example";

/** Euclidean drums, with hat velocity stepped by `counter`. */
const drums = `tempo(120)

seq(p\`60(4,4)\`).trig.kick().mul(0.9).out()
seq("~ 60 ~ 60").trig.snare().mul(0.7).out()
seq("60*8").trig.apply((t) =>
  t.hihat({ decay: 0.04 }).mul(counter(t).seq(p\`1 0.5 0.7 0.4\`.steps())).mul(0.5).out(),
)
`;

export const drumsExample: Example = { name: "drums", source: drums };
