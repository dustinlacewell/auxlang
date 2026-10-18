/**
 * Slew limiter / lag. `rise`/`fall` are the seconds to traverse one full unit;
 * the per-sample step is 1/(time*sr), so it is unit-linear (correct portamento
 * on semitone pitch: gliding an octave takes the same time regardless of range).
 */
defmod("slew", { cat: "utils", doc: "Limits how fast a signal can change — glide and declicking.", args: ["rise", "fall"] }, ({ sr }) => {
	let current = 0
	let started = 0
	return ({ in: x = 0, rise = secs(0.1), fall = secs(0.1) }) => {
		if (started === 0) {
			current = x
			started = 1
		}
		let next = 0
		if (x > current) {
			next = rise <= 0 ? x : Math.min(x, current + 1 / (rise * sr))
		} else {
			next = fall <= 0 ? x : Math.max(x, current - 1 / (fall * sr))
		}
		current = next
		return next
	}
})
