/**
 * Sum all lanes of `in` to a single lane, scaled by 1/√width. Normalization is
 * purely a function of static width — NO per-sample active/zero-crossing counting
 * (that made the scale factor jump whenever a lane momentarily hit zero).
 */
defmod("mix", { doc: "Sums many signals down to one.", reduce: true }, ({ width }) => {
	return ({ in: lanes = 0 }) => {
		let sum = 0
		if (typeof lanes === "number") sum = lanes
		else for (let l = 0; l < width; l++) sum += lanes[l] ?? 0
		return sum / Math.sqrt(Math.max(1, width))
	}
})
