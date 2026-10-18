import type { Example } from "@/ui/editor/examples/example";

/** A sub-patch saved as a module and used twice. */
const subpatch = `tempo(110)

defpatch("pluck", ({ pitch = 48, bright = 91 }) => pitch.saw().lpf({ cutoff: bright, res: 0.4 }))

const lead = seq("c4 e4 g4 <b4 a4>")
const bass = seq("c2 ~ g1 ~")
lead.pluck({ bright: 96 }).mul(lead.gate.ad(0.005, 0.2)).gain(0.2).out()
bass.pluck(79).mul(bass.gate.ad(0.005, 0.3)).gain(0.3).out()
`;

export const subpatchExample: Example = {
	name: "patch as a module",
	source: subpatch,
};
