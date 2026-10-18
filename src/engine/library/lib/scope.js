/**
 * Shows its input as a waveform in the editor; passes the input through. A
 * sweep scope, after VCV Rack's Scope: `buf` holds TRACES lanes of BUCKETS
 * (lo, hi) pairs, one sweep of `time` seconds, each bucket folding
 * `samplesPerBucket` samples to their min/max. A sweep records bucket 0 to
 * BUCKETS, then waits for a trigger: trace 0 rising through the midpoint of
 * the last sweep's range (a Schmitt band of 5% of that range either side), or
 * a whole sweep's time with no edge (auto, so a signal with no edge still
 * redraws). `head` is the bucket being written, BUCKETS while waiting. Trace 0
 * is `in`; members of the open channel group are traces 1.. (at most
 * TRACES - 1); unused traces hold 0. `min`/`max` fix the editor's scale;
 * equal (default) fits it.
 */
defmod(
	"scope",
	{
		cat: "utils",
		doc: "Shows its input as a waveform in the editor; passes the input through.",
		args: ["time"],
		display: { kind: "wave", buffer: "buf", head: "head", traces: 8 },
		config: { width: 120, height: 36, min: 0, max: 0 },
	},
	({ sr }) => {
		const BUCKETS = 512
		const TRACES = 8
		const buf = new Float32Array(TRACES * BUCKETS * 2)
		const lo = new Float32Array(TRACES)
		const hi = new Float32Array(TRACES)
		let head = 0
		let fill = 0
		let sweepLo = 0
		let sweepHi = 0
		let threshold = 0
		let band = 0
		let armed = 0
		let waited = 0
		return ({ in: x = 0, ch = group(sig(0), { open: true }), time = secs(0.02) }) => {
			const samplesPerBucket = Math.max(1, Math.ceil((time * sr) / BUCKETS))
			if (head >= BUCKETS) {
				waited++
				if (x < threshold - band) armed = 1
				const edge = armed === 1 && x >= threshold + band
				if (edge || waited >= samplesPerBucket * BUCKETS) {
					head = 0
					fill = 0
					armed = 0
					waited = 0
				}
			}
			if (head < BUCKETS) {
				const traceCount = Math.min(ch.length + 1, TRACES)
				const firstOfBucket = fill === 0
				for (let t = 0; t < traceCount; t++) {
					const v = t === 0 ? x : ch[t - 1]
					if (firstOfBucket || v < lo[t]) lo[t] = v
					if (firstOfBucket || v > hi[t]) hi[t] = v
				}
				const firstOfSweep = firstOfBucket && head === 0
				if (firstOfSweep || x < sweepLo) sweepLo = x
				if (firstOfSweep || x > sweepHi) sweepHi = x
				fill++
				if (fill >= samplesPerBucket) {
					for (let t = 0; t < TRACES; t++) {
						const i = (t * BUCKETS + head) * 2
						buf[i] = t < traceCount ? lo[t] : 0
						buf[i + 1] = t < traceCount ? hi[t] : 0
					}
					head++
					fill = 0
					if (head >= BUCKETS) {
						threshold = (sweepLo + sweepHi) / 2
						band = 0.05 * (sweepHi - sweepLo)
					}
				}
			}
			return x
		}
	},
)
