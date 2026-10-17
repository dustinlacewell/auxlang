/**
 * Clock (MANIFESTO §4.2): integrates a position in bars (cycles) from `bpm`
 * beats per minute and `config.beatsPerBar` beats per bar. Tempo is an input,
 * so tempo modulation is patching. Outputs:
 *
 *   out   position in bars, unbounded — what seq reads
 *   beat  single-sample trig at each beat
 *   bar   single-sample trig at each bar
 *
 * Both trigs fire on the first sample. The meter is read every tick, never
 * cached in state.
 */
defmod(
	"clock",
	{
		cat: "timing",
		doc: "A position in bars at a tempo; outputs position, beat trig, and bar trig.",
		args: ["bpm"],
		outs: { out: phasePort(), beat: trigPort(), bar: trigPort() },
	},
	({ sr, beatsPerBar = 4 }) => {
		let pos = 0
		let lastBeat = -1
		let lastBar = -1
		return ({ bpm = sig(120) }) => {
			pos = pos + bpm / 60 / sr / beatsPerBar
			const bar = Math.floor(pos)
			const beat = Math.floor(pos * beatsPerBar)
			const beatTrig = beat !== lastBeat ? 1 : 0
			const barTrig = bar !== lastBar ? 1 : 0
			lastBeat = beat
			lastBar = bar
			return { out: pos, beat: beatTrig, bar: barTrig }
		}
	},
)
