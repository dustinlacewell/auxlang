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
	defmod({
		name,
		category: "sources",
		doc,
		ins: {
			value: slotted(sig(0), { min: "min", max: "max" }),
			min: sig(0),
			max: sig(1),
			slew: secs(0.01),
		},
		outs: { out: sig() },
		defaultIn: "value",
		defaultOut: "out",
		positional: ["value", "min", "max"],
		state: () => ({ current: 0, target: 0, step: 0, started: 0 }),
		helpers: { clampSlot, rampStep, approach },
		tick: (s, i, o, _cfg, sr) => {
			const v = clampSlot(i.value, i.min, i.max);
			if (s.started === 0) {
				s.current = v;
				s.target = v;
				s.started = 1;
			}
			if (v !== s.target) {
				s.target = v;
				s.step = rampStep(s.current, v, i.slew, sr);
			}
			s.current = approach(s.current, s.target, s.step);
			o.out = s.current;
		},
	});
}

defmod({
	name: "xy",
	category: "sources",
	doc: "An x/y pad the editor sets while the patch plays; outputs x and y.",
	ins: {
		x: slotted(sig(0), { min: "min", max: "max" }),
		y: slotted(sig(0), { min: "min", max: "max" }),
		min: sig(0),
		max: sig(1),
		slew: secs(0.01),
	},
	outs: { x: sig(), y: sig() },
	defaultIn: "x",
	positional: ["x", "y", "min", "max"],
	state: () => ({ x: 0, y: 0, tx: 0, ty: 0, sx: 0, sy: 0, started: 0 }),
	helpers: { clampSlot, rampStep, approach },
	tick: (s, i, o, _cfg, sr) => {
		const x = clampSlot(i.x, i.min, i.max);
		const y = clampSlot(i.y, i.min, i.max);
		if (s.started === 0) {
			s.x = x;
			s.y = y;
			s.tx = x;
			s.ty = y;
			s.started = 1;
		}
		if (x !== s.tx) {
			s.tx = x;
			s.sx = rampStep(s.x, x, i.slew, sr);
		}
		if (y !== s.ty) {
			s.ty = y;
			s.sy = rampStep(s.y, y, i.slew, sr);
		}
		s.x = approach(s.x, s.tx, s.sx);
		s.y = approach(s.y, s.ty, s.sy);
		o.x = s.x;
		o.y = s.y;
	},
});

defmod({
	name: "toggle",
	category: "sources",
	doc: "An on/off switch the editor sets while the patch plays; outputs a gate.",
	ins: { on: slotted(gatePort(0), { min: 0, max: 1 }) },
	outs: { out: gatePort() },
	defaultIn: "on",
	defaultOut: "out",
	positional: ["on"],
	helpers: { clampSlot },
	tick: (_s, i, o) => {
		o.out = clampSlot(i.on, 0, 1) >= 0.5 ? 1 : 0;
	},
});

defmod({
	name: "button",
	category: "sources",
	doc: "A button the editor presses while the patch plays: a gate while held, a trigger on press.",
	ins: { pressed: slotted(gatePort(0), { min: 0, max: 1 }) },
	outs: { out: gatePort(), trig: trigPort() },
	defaultIn: "pressed",
	defaultOut: "out",
	positional: [],
	state: () => ({ held: 0 }),
	helpers: { clampSlot },
	tick: (s, i, o) => {
		const down = clampSlot(i.pressed, 0, 1) >= 0.5 ? 1 : 0;
		o.trig = down === 1 && s.held === 0 ? 1 : 0;
		s.held = down;
		o.out = down;
	},
});
