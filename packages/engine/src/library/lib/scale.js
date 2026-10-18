/** Map `in` from [from, to] onto [min, max] linearly (default: bipolar → unipolar). */
defmod(
	"scale",
	{ cat: "utils", doc: "Remaps a signal from one range onto another.", args: ["from", "to", "min", "max"] },
	() => {
		return ({ in: x = 0, from = -1, to = 1, min = 0, max = 1 }) => {
			const span = to - from
			const norm = span === 0 ? 0 : (x - from) / span
			return min + norm * (max - min)
		}
	},
)
