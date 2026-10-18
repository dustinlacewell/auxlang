/** Clamp signal to [min, max]. */
defmod("clip", { doc: "Clamps a signal between a minimum and maximum.", args: ["min", "max"] }, () => {
	return ({ in: x = 0, min = -1, max = 1 }) => Math.max(min, Math.min(max, x))
})
