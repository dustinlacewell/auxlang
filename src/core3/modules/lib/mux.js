/**
 * Switch between live cables by index: every palette member runs all the
 * time; `index` only ever picks which one reaches `out`. Index is truncated
 * to an integer; out of range (including negative) is 0. No table reading.
 */
defmod("mux", { cat: "utils", doc: "Switches between palette members by index; out of range is 0." }, () => {
	return ({ index = 0, palette = sigs(0) }) => {
		const k = Math.trunc(index)
		return k >= 0 && k < palette.length ? palette[k] : 0
	}
})
