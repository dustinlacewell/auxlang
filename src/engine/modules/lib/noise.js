/**
 * White noise. `Math.random()` in a tick is the lane's seeded stream, seeded
 * from (patch seed, node identity, lane), so every instance and every lane
 * differs and re-eval continues the stream. Output is uniform in [min, max].
 */
defmod("noise", { cat: "sources", doc: "White noise." }, () => {
	return ({ min = -1, max = 1 }) => {
		return min + Math.random() * (max - min)
	}
})
