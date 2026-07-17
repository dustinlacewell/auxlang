import { defineModule } from "../../module/define";
import { hz, sig, trigPort, unit } from "../../types";

/**
 * 808-style kick: a sine body whose pitch is swept down by a fast envelope, plus
 * a short click transient. Retriggered on `trig` rising past 0.5. All state is
 * allocated in state(); no tick-time allocation.
 */
export const kick = defineModule({
	name: "kick",
	ins: {
		trig: trigPort(),
		pitch: hz(50),
		sweep: sig(4),
		decay: sig(0.3),
		click: unit(0.3),
	},
	outs: { out: sig() },
	defaultIn: "trig",
	defaultOut: "out",
	positional: ["pitch", "sweep", "decay", "click"],
	state: () => ({ phase: 0, amp: 0, pitchEnv: 0, clickPhase: 0, wasTrig: 0 }),
	tick: (s, i, o, _cfg, sr) => {
		if (i.trig > 0.5 && (s.wasTrig as number) <= 0.5) {
			s.amp = 1;
			s.pitchEnv = 1;
			s.phase = 0;
			s.clickPhase = 0;
		}
		s.wasTrig = i.trig;

		const decay = Math.max(0.01, i.decay);
		const click = Math.max(0, Math.min(1, i.click));

		let pitchEnv = s.pitchEnv as number;
		pitchEnv = Math.max(0, pitchEnv - pitchEnv * (1 / (0.03 * sr)) * 10);
		s.pitchEnv = pitchEnv;

		const freq = i.pitch * (1 + pitchEnv * (i.sweep - 1));
		let phase = ((s.phase as number) + freq / sr) % 1;
		s.phase = phase;
		const body = Math.sin(phase * Math.PI * 2);

		let clickPhase = (s.clickPhase as number) + (i.pitch * 4) / sr;
		s.clickPhase = clickPhase;
		const clickEnv = Math.max(0, 1 - clickPhase * 50);
		const clickSound = Math.sin(clickPhase * Math.PI * 2) * clickEnv * click;

		let amp = s.amp as number;
		amp = Math.max(0, amp - amp * (1 / (decay * sr)) * 3);
		s.amp = amp;

		o.out = (body + clickSound) * amp;
	},
});
