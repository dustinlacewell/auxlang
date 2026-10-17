/**
 * Controls: values the editor sets while the patch plays. Each control port
 * (`slotted`) reads a live slot (runtime/live/live-contract.ts) at the
 * control call's site, starting at the value written in the code; the
 * editor's widget writes it with no re-eval. A signal bound instead is used
 * as is.
 *
 * Every control clamps its value to its range at the module, so a bad write
 * cannot escape it (NaN reads as the range's minimum).
 *
 * slider/knob/xy ramp to each new value linearly over `slew` seconds (10 ms
 * default, 0 jumps), so a step write gives no click. toggle and button do
 * not slew. xy's two slots: x at the call's site, y at site + 0.5
 * (compile/bind-slots.ts).
 */

/** `v` clamped to [lo, hi]; NaN reads as `lo`. */
function clampSlot(v, lo, hi) {
	if (v !== v) return lo;
	return Math.max(lo, Math.min(hi, v));
}

/** The per-sample step that reaches `target` from `current` in `slew` seconds; a jump when slew <= 0. */
function rampStep(current, target, slew, sr) {
	if (slew <= 0) return target - current;
	return (target - current) / (slew * sr);
}

/** One step from `current` toward `target`, landing on it exactly. */
function approach(current, target, step) {
	if (current === target) return target;
	const next = current + step;
	if (step > 0 ? next >= target : next <= target) return target;
	return next;
}

for (const [name, doc] of [
	["slider", "A slider the editor sets while the patch plays; ramps to each value."],
	["knob", "A knob the editor sets while the patch plays; ramps to each value."],
]) {
	defmod(name, { cat: "sources", doc, args: ["value", "min", "max"] }, ({ sr }) => {
		let current = 0
		let target = 0
		let rampStepValue = 0
		let started = 0
		return ({ value = slot(0, "min", "max"), min = 0, max = 1, slew = secs(0.01) }) => {
			const v = clampSlot(value, min, max)
			if (started === 0) {
				current = v
				target = v
				started = 1
			}
			if (v !== target) {
				target = v
				rampStepValue = rampStep(current, v, slew, sr)
			}
			current = approach(current, target, rampStepValue)
			return current
		}
	})
}

defmod("xy", { cat: "sources", doc: "An x/y pad the editor sets while the patch plays; outputs x and y.", args: ["x", "y", "min", "max"] }, ({ sr }) => {
	let x = 0
	let y = 0
	let tx = 0
	let ty = 0
	let sx = 0
	let sy = 0
	let started = 0
	return ({ x: xIn = slot(0, "min", "max"), y: yIn = slot(0, "min", "max"), min = 0, max = 1, slew = secs(0.01) }) => {
		const xClamped = clampSlot(xIn, min, max)
		const yClamped = clampSlot(yIn, min, max)
		if (started === 0) {
			x = xClamped
			y = yClamped
			tx = xClamped
			ty = yClamped
			started = 1
		}
		if (xClamped !== tx) {
			tx = xClamped
			sx = rampStep(x, xClamped, slew, sr)
		}
		if (yClamped !== ty) {
			ty = yClamped
			sy = rampStep(y, yClamped, slew, sr)
		}
		x = approach(x, tx, sx)
		y = approach(y, ty, sy)
		return { x, y }
	}
})

defmod("toggle", { cat: "sources", doc: "An on/off switch the editor sets while the patch plays; outputs a gate.", args: ["on"] }, () => {
	return ({ on = slot(gatePort(0), 0, 1) }) => {
		return clampSlot(on, 0, 1) >= 0.5 ? 1 : 0
	}
})

defmod(
	"button",
	{ cat: "sources", doc: "A button the editor presses while the patch plays: a gate while held, a trigger on press.", args: [] },
	() => {
		let held = 0
		return ({ pressed = slot(gatePort(0), 0, 1) }) => {
			const down = clampSlot(pressed, 0, 1) >= 0.5 ? 1 : 0
			const trig = down === 1 && held === 0 ? 1 : 0
			held = down
			return { out: down, trig }
		}
	},
)
