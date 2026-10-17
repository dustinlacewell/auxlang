/**
 * One-sample delay (z⁻¹). The delay lives on the node's INPUT EDGE: compile
 * turns every connection into a z1 into a z-edge (PortSrc kind "z", read one
 * sample late — see compile/z1-edges.ts), and `loop()` wires its back-edge the
 * same way. The tick itself is a passthrough, so a cycle through z1 is delayed
 * exactly once, whether written as `loop(...)` or a hand-chained `.z1()`.
 */
defmod("z1", { doc: "One-sample delay." }, () => {
	return ({ in: x = 0 }) => x
})
