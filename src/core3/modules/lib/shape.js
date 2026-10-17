/**
 * Waveshaper: soft saturation via tanh drive. `amount` (0..1) sets how hard the
 * signal is pushed into the curve — 0 passes through clean, 1 is heavy
 * saturation. The tanh is normalized by the drive so level stays roughly
 * constant as `amount` rises; it fattens and rounds rather than just clipping.
 */
defmod("shape", { cat: "effects", doc: "Soft-saturation waveshaper — tanh drive from clean to crunchy.", args: ["amount"] }, () => {
	return ({ in: x = 0, amount = unit(0.3) }) => {
		const amountClamped = Math.max(0, Math.min(1, amount))
		if (amountClamped === 0) {
			return x // clean passthrough — a waveshaper at 0 is identity
		}
		const drive = 1 + amountClamped * 24
		const shaped = Math.tanh(x * drive) / Math.tanh(drive)
		// Crossfade clean→shaped by amount so the onset of saturation is gradual
		// and amount just below the max isn't a discontinuity from the drive jump.
		return x * (1 - amountClamped) + shaped * amountClamped
	}
})
