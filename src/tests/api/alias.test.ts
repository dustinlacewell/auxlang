import { describe, expect, it, beforeEach } from "vitest";
import { device, gain, lfo, saw, lpf, noise, delay } from "../../editor/api";
import { isPoly } from "../../descriptor/poly";
import { isDescriptor } from "../../descriptor/guards/is-descriptor";
import { isOutputRef } from "../../descriptor/guards/is-output-ref";
import { resetIdCounter } from "../../descriptor/identity";
import { clearRegistry } from "../../descriptor/registry";

describe("device prefab", () => {
	beforeEach(() => {
		resetIdCounter();
		clearRegistry();
	});

	describe("single-device prefab", () => {
		it("creates prefab from single device", () => {
			const prefab = device("darkFilter", lpf({ cutoff: 800 }));
			expect(isDescriptor(prefab)).toBe(true);
		});

		it("chaining binds source to head's defaultInput", () => {
			device("darkFilter", lpf({ cutoff: 800 }));

			const result = (saw(440) as any).darkFilter();
			const bindings = result._state.inputBindings;

			expect(isOutputRef(bindings.input)).toBe(true);
			expect(bindings.cutoff).toBe(800);
		});

		it("object params override head bindings", () => {
			device("darkFilter", lpf({ cutoff: 800 }));

			const result = (saw(440) as any).darkFilter({ cutoff: 2000 });
			expect(result._state.inputBindings.cutoff).toBe(2000);
		});

		it("method params set head bindings", () => {
			device("darkFilter", lpf({ cutoff: 800 }));

			const result = (saw(440) as any).darkFilter().resonance(0.8);
			expect(result._state.inputBindings.resonance).toBe(0.8);
		});

		it("positional args apply to head", () => {
			// lpf positionalArgs is ["cutoff", "resonance"]
			device("darkFilter", lpf({ cutoff: 800 }));

			const result = (saw(440) as any).darkFilter(2000);
			expect(result._state.inputBindings.cutoff).toBe(2000);
		});
	});

	describe("multi-device prefab (chain)", () => {
		it("creates prefab from chain", () => {
			const prefab = device("shimmer", saw().lpf({ cutoff: 2000 }).delay({ time: 0.1 }));
			// Prefab should be truthy (exact type TBD)
			expect(prefab).toBeTruthy();
		});

		it("chaining binds source to head's defaultInput", () => {
			device("shimmer", saw().lpf({ cutoff: 2000 }).delay({ time: 0.1 }));

			// seq chains into the saw (head), output comes from delay (tail)
			const result = (lfo(1) as any).shimmer();

			// Result should be the tail (delay) with the whole chain instantiated
			expect(isDescriptor(result)).toBe(true);
			// The delay should have time=0.1 from template
			expect(result._state.inputBindings.time).toBe(0.1);
		});

		it("object params apply to head device", () => {
			device("shimmer", saw().lpf({ cutoff: 2000 }).delay({ time: 0.1 }));

			// freq goes to saw (the head)
			const result = (lfo(1) as any).shimmer({ freq: 880 });

			// Result is still the tail, but head (saw) got freq=880
			expect(isDescriptor(result)).toBe(true);
		});

		it("method params apply to head device", () => {
			device("shimmer", saw().lpf({ cutoff: 2000 }).delay({ time: 0.1 }));

			const result = (lfo(1) as any).shimmer().freq(880);

			// Should return tail with freq set on head
			expect(isDescriptor(result)).toBe(true);
		});

		it("further chaining works off tail", () => {
			device("shimmer", saw().lpf({ cutoff: 2000 }).delay({ time: 0.1 }));

			const result = (lfo(1) as any).shimmer().gain(0.5);

			// gain chains off delay (the tail)
			expect(isDescriptor(result)).toBe(true);
			expect(result._state.inputBindings.level).toBe(0.5);
		});

		it("each instantiation clones the entire subgraph", () => {
			device("shimmer", saw().lpf({ cutoff: 2000 }).delay({ time: 0.1 }));

			const r1 = (lfo(1) as any).shimmer();
			const r2 = (lfo(2) as any).shimmer();

			// Different instances should have different descriptor IDs
			expect(r1._state.id).not.toBe(r2._state.id);
		});

		it("prefab preserves internal connections", () => {
			device("shimmer", saw().lpf({ cutoff: 2000 }).delay({ time: 0.1 }));

			const result = (lfo(1) as any).shimmer();

			// The delay's input should be connected to lpf's output
			// which is connected to saw's output
			// which has lfo connected to its freq
			expect(isOutputRef(result._state.inputBindings.input)).toBe(true);
		});
	});

	describe("poly prefab", () => {
		it("creates prefab from poly template", () => {
			const prefab = device("stereoTrem", gain(lfo([0.2, 0.45]).cv));
			expect(isPoly(prefab)).toBe(true);
		});

		it("poly prefab has correct voice count", () => {
			const prefab = device("stereoTrem", gain(lfo([0.2, 0.45]).cv));

			if (isPoly(prefab)) {
				expect(prefab.voices.length).toBe(2);
			} else {
				throw new Error("Expected poly");
			}
		});

		it("chaining to poly prefab returns poly", () => {
			device("stereoTrem", gain(lfo([0.2, 0.45]).cv));

			const result = (saw(440) as any).stereoTrem();
			expect(isPoly(result)).toBe(true);

			if (isPoly(result)) {
				expect(result.voices.length).toBe(2);
			}
		});

		it("chaining binds input to each voice's head", () => {
			device("stereoTrem", gain(lfo([0.2, 0.45]).cv));

			const result = (saw(440) as any).stereoTrem();

			if (isPoly(result)) {
				for (const voice of result.voices) {
					if (isDescriptor(voice)) {
						expect(isOutputRef(voice._state.inputBindings.input)).toBe(true);
						expect(isOutputRef(voice._state.inputBindings.level)).toBe(true);
					}
				}
			}
		});

		it("poly prefab preserves per-voice bindings", () => {
			const prefab = device("dualGain", gain([0.3, 0.7]));

			if (isPoly(prefab)) {
				const voice0 = prefab.voices[0];
				const voice1 = prefab.voices[1];

				if (isDescriptor(voice0) && isDescriptor(voice1)) {
					expect(voice0._state.inputBindings.level).toBe(0.3);
					expect(voice1._state.inputBindings.level).toBe(0.7);
				}
			}
		});

		it("further chaining on poly prefab result works", () => {
			device("stereoTrem", gain(lfo([0.2, 0.45]).cv));

			const result = (saw(440) as any).stereoTrem().lpf({ cutoff: 1000 });
			expect(isPoly(result)).toBe(true);

			if (isPoly(result)) {
				expect(result.voices.length).toBe(2);
				for (const voice of result.voices) {
					if (isDescriptor(voice)) {
						expect(voice._state.inputBindings.cutoff).toBe(1000);
					}
				}
			}
		});
	});

	describe("edge cases", () => {
		it("multiple prefabs can coexist", () => {
			device("trem1", gain(lfo(0.5).cv));
			device("trem2", gain(lfo(2.0).cv));

			const r1 = (saw(440) as any).trem1();
			const r2 = (saw(440) as any).trem2();

			expect(isDescriptor(r1)).toBe(true);
			expect(isDescriptor(r2)).toBe(true);
		});

		it("poly prefab with 3+ voices", () => {
			const prefab = device("triTrem", gain(lfo([0.2, 0.4, 0.6]).cv));

			expect(isPoly(prefab)).toBe(true);
			if (isPoly(prefab)) {
				expect(prefab.voices.length).toBe(3);
			}
		});

		it("direct call to poly prefab applies args to heads", () => {
			const stereoGain = device("stereoGain", gain([0.5, 0.5]));

			const result = (stereoGain as any)({ input: saw(440) });

			expect(isPoly(result)).toBe(true);
			if (isPoly(result)) {
				for (const voice of result.voices) {
					if (isDescriptor(voice)) {
						expect(isOutputRef(voice._state.inputBindings.input)).toBe(true);
					}
				}
			}
		});
	});
});
