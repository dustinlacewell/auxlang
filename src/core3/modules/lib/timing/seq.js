/**
 * seq — the bridge (MANIFESTO §4.1): reads a pattern at a position signal.
 * `config.pattern` is Pat data (voiced; `config.lanes` lanes), `config.seed`
 * the program seed, `config.clocked` 1 when the position is wired straight to
 * a clock (set at compile). An unconnected position is the ambient clock.
 * Each lane reads its event table (pattern/table/event-table.ts) at the
 * position, through the table intrinsics:
 *
 *   out    the value under the position, held through rests
 *   gate   high in a note, a slide, and their ties; a 1 ms dip between
 *          touching notes
 *   trig   one sample when the position enters a different note; a slide
 *          entered from the note before it fires nothing
 *   slide  high inside a slide
 *   fields one output per record field of the pattern (`p.with`), named
 *          after it; members set from the pattern at eval. Updated with
 *          `out`, so each holds through rests like `out`
 *
 * State is fixed-shape: the reader's row, note id, gate, dip countdown, last
 * position, and whether it has ticked. The tables are scratch, rebuilt, never
 * carried — so a pattern edit keeps the reader, and a note still under the
 * position after the edit gives no trig and no dip.
 *
 * Row kinds: 0 rest, 1 note, 2 tie, 3 slide. The note id of "no note" is
 * -Number.MAX_VALUE (pattern/table/event-table.ts).
 */

/** trig fires when the position enters a different note; a slide entered from the note it slides from fires nothing. */
function trigOf(kind, noteId, slideFrom, prevNoteId) {
	if (kind === 0 || noteId === prevNoteId) return 0
	return kind === 3 && slideFrom === prevNoteId ? 0 : 1
}

function slideOf(kind) {
	return kind === 3 ? 1 : 0
}

/** The note id the reader remembers: none inside a rest. */
function heldNoteId(kind, noteId) {
	return kind === 0 ? -1.7976931348623157e308 : noteId
}

/** Unclocked dip countdown in samples: restarts on a trig into a high gate, else counts down. */
function dipLeftAfter(trig, gateWas, dipLeft, dipSamples) {
	if (trig === 1 && gateWas === 1) return dipSamples
	return dipLeft > 0 ? dipLeft - 1 : 0
}

/** Clocked dip: the last `dipBeats` of a row marked to dip before the next note. */
function inDipWindow(pos, end, dipBefore, dipBeats) {
	return dipBefore === 1 && pos >= end - dipBeats ? 1 : 0
}

function gateOf(kind, dipLeft, dipWindow) {
	return kind !== 0 && dipLeft === 0 && dipWindow === 0 ? 1 : 0
}

/** The 1 ms dip in samples. */
function dipSamplesAt(sampleRate) {
	return Math.round(0.001 * sampleRate)
}

/** The 1 ms dip in position units, from the position's per-sample step (0 before a first step). */
function dipBeatsAt(started, step, sampleRate) {
	return started === 1 && step > 0 ? 0.001 * sampleRate * step : 0
}

defmod(
	"seq",
	{
		cat: "timing",
		doc: "Reads a pattern at a position (default: the clock); outputs value, gate, trig, and slide.",
		args: ["pattern", "position"],
		reads: "pattern",
		outs: {
			out: semis(0),
			gate: gatePort(),
			trig: trigPort(),
			slide: gatePort(),
			fields: group(sig(0), { open: true }),
		},
	},
	({ sr, pattern, seed, lanes, clocked }) => {
		let lastRow = 0
		let heldId = -1.7976931348623157e308
		let gateWas = 0
		let dipWas = 0
		let lastPos = 0
		let started = 0
		return ({ position = phasePort(0) }, o) => {
			const pos = position
			const cycle = Math.floor(pos)
			if (cycle !== __tableCycle()) __tableFill(cycle)

			// The row under the position: walk a step or two from the last row
			// (the position moved a little), else binary-search the begins.
			const last = __tableCount() - 1
			let row = Math.min(Math.max(lastRow | 0, 0), last)
			let found = false
			for (let step = 0; step <= 2; step++) {
				if (pos < __tableRow("begin", row)) {
					if (row === 0) {
						found = true
						break
					}
					row--
				} else if (pos >= __tableRow("end", row)) {
					if (row === last) {
						found = true
						break
					}
					row++
				} else {
					found = true
					break
				}
			}
			if (!found) {
				let lo = 0
				let hi = last
				while (lo < hi) {
					const mid = (lo + hi + 1) >> 1
					if (__tableRow("begin", mid) <= pos) lo = mid
					else hi = mid - 1
				}
				row = lo
			}

			const kind = __tableRow("kind", row)
			const noteId = __tableRow("noteId", row)
			const trig = trigOf(kind, noteId, __tableRow("slideFrom", row), heldId)
			const isClocked = clocked === 1
			const dipLeft = isClocked ? 0 : dipLeftAfter(trig, gateWas, dipWas, dipSamplesAt(sr))
			const dipWindow = isClocked
				? inDipWindow(
						pos,
						__tableRow("end", row),
						__tableRow("dipBefore", row),
						dipBeatsAt(started, pos - lastPos, sr),
					)
				: 0
			const gate = gateOf(kind, dipLeft, dipWindow)

			for (let k = 0; k < o.fields.length; k++) o.fields[k] = __tableField(k, row)
			lastRow = row
			heldId = heldNoteId(kind, noteId)
			gateWas = gate
			dipWas = dipLeft
			lastPos = pos
			started = 1
			return { out: __tableRow("value", row), gate, trig, slide: slideOf(kind) }
		}
	},
)
