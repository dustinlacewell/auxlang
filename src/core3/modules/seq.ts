import { laneTable } from "../bridge/lane-table";
import {
	dipBeatsAt,
	dipLeftAfter,
	dipSamplesAt,
	gateOf,
	heldNoteId,
	inDipWindow,
	trigOf,
} from "../bridge/read-step";
import { defmod } from "../patch/defmod";
import { NO_NOTE } from "../pattern/table/event-table";
import { locate } from "../pattern/table/locate";
import { gatePort, phasePort, trigPort } from "../types";
import { semis } from "../units/tag";

/**
 * seq — the bridge (MANIFESTO §4.1): reads a pattern at a position signal.
 * `config.pattern` is Pat data (voiced; `config.lanes` lanes), `config.seed`
 * the program seed, `config.clocked` 1 when the position is wired straight to
 * a clock (set at compile). An unconnected position is the ambient clock.
 * Each lane reads its event table (lane-table.ts) at the position:
 *
 *   out   the value under the position, held through rests
 *   gate  high in a note and its ties; a 1 ms dip between touching notes
 *   trig  one sample when the position enters a different note
 *
 * State is fixed-shape: the reader's row, note id, gate, dip countdown, last
 * position, and whether it has ticked. The tables are scratch, rebuilt, never
 * carried — so a pattern edit keeps the reader, and a note still under the
 * position after the edit gives no trig and no dip.
 */
defmod({
	name: "seq",
	category: "timing",
	doc: "Reads a pattern at a position (default: the clock); outputs value, gate, and trig.",
	ins: { position: phasePort(0) },
	outs: { out: semis(0), gate: gatePort(), trig: trigPort() },
	defaultIn: "position",
	defaultOut: "out",
	positional: ["pattern", "position"],
	config: { pattern: { op: "silence" }, seed: 1, lanes: 1, clocked: 0 },
	state: () => ({ row: 0, noteId: NO_NOTE, gate: 0, dipLeft: 0, lastPos: 0, started: 0 }),
	tick: (s, i, o, cfg, sr) => {
		const pos = i.position;
		const t = laneTable(s, cfg, pos);
		const row = locate(t, pos, s.row as number);
		const kind = t.kind[row] as number;
		const trig = trigOf(kind, t.noteId[row] as number, s.noteId as number);
		const clocked = cfg.clocked === 1;
		const dipLeft = clocked
			? 0
			: dipLeftAfter(trig, s.gate as number, s.dipLeft as number, dipSamplesAt(sr));
		const dipWindow = clocked
			? inDipWindow(
					pos,
					t.end[row] as number,
					t.dipBefore[row] as number,
					dipBeatsAt(s.started as number, pos - (s.lastPos as number), sr),
				)
			: 0;
		const gate = gateOf(kind, dipLeft, dipWindow);

		o.out = t.value[row] as number;
		o.gate = gate;
		o.trig = trig;
		s.row = row;
		s.noteId = heldNoteId(kind, t.noteId[row] as number);
		s.gate = gate;
		s.dipLeft = dipLeft;
		s.lastPos = pos;
		s.started = 1;
	},
});
