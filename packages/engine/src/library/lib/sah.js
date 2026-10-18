/** Sample & hold — latches `in` when `trig` crosses 0.5, holds otherwise. */
defmod("sah", { doc: "Sample and hold: freezes the input on each trigger.", args: ["trig"] }, () => {
	let held = 0
	let started = 0
	return ({ in: x = 0, trig = trigPort(0) }) => {
		if (started === 0) {
			held = x
			started = 1
		}
		if (trig > 0.5) held = x
		return held
	}
})
