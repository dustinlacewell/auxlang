# Guide rewrite: brick by brick

**Not built.** This is the plan for the new guide page (`src/ui/site/guide/`).

## Rules for every brick

- One idea. One or two short sentences. One runnable example.
- Each example changes one thing from the brick before it.
- Say only what the reader cannot hear or see. No obvious tails, no how
  it works inside.
- An example uses only what earlier bricks taught.
- Language rules come first, taught with `sin` and `out` only. Later
  chapters add modules. They do not add rules.
- Reference tables (all notation, all pattern methods) live on the
  patterns page, not here.

## 1. A sound (the language, part 1)

1. `sin().out()` — A module is a function. `sin` makes a tone. `out` sends it to the speakers.
2. `sin(60).out()` — An argument sets an input. Here it sets the pitch. 60 is middle C.
3. `sin(72).out()` — Pitch counts in semitones. Add 12 to go up one octave. `sin("c5")` is the same note.
4. `sin({ pitch: 60 }).out()` — You can set an input by name.
5. `sin().pitch(60).out()` — Or with a setter.

## 2. Chains and signals (the language, part 2)

6. `out(sin(60))` — This is the same as `sin(60).out()`. A chain `a.b()` feeds `a` into the main input of `b`.
7. `sin(60).out({ gain: 0.3 })` — `out` has inputs too. `gain` sets the volume.
8. `sin(hz(440)).out()` — `hz()` gives a value in Hz.
9. `sin(sin(hz(0.2), 48, 72)).out()` — An output can feed any input.

## 3. Parts in variables (the language, part 3)

10. `const tone = sin(60)` then `tone.out()` — A `const` holds a part of a patch.
11. `const wobble = sin(hz(0.2), 48, 72)` then `sin(wobble).out()` — A part can feed an input.
12. `sin(wobble.add(7)).out()` — `add` moves a signal up. This tone is a fifth above the wobble.
13. `sin(wobble).out()` and `sin(wobble.add(7)).out()` — One part can feed two places. Both tones play.
14. `const a = sin(60)` and `const b = a.pitch(67)` — A setter makes a new part. `a` still plays 60.
15. A part that never reaches `out` makes no sound.

## 4. See and touch

16. `sin(60).scope().out()` — `scope` draws the wave. The sound still plays.
17. `sin(hz(0.5)).scope()` — A scope draws even with no `out`.
18. `sin(knob(60, 48, 72)).out()` — A knob appears in the editor. Turn it while the sound plays.
19. `slider(60, 48, 72)` — The same, as a slider.
20. `const pad = xy(0, 0, 48, 72)` then `sin(pad.x)` and `sin(pad.y)` — Some modules have more than one output. Read one by name.
21. `sin(60).out({ gain: toggle() })` — A switch turns the sound on and off.
22. `sin(60).out({ gain: button() })` — The sound plays while you hold the button.

## 5. Sound modules (new modules, same rules)

23. `saw(60)`, `tri(60)`, `sqr(60)` — Other wave shapes.
24. `noise()` — Noise.
25. `saw(48).lpf(72)` — A filter cuts the highs above its cutoff. The cutoff is a pitch too.
26. `.lpf(72, 0.6)` — The second input makes the filter ring.
27. `const voice = saw(48).lpf(72, 0.6)` — A part can be a whole chain. `voice.out()` plays it.
28. `lfo(0.2, 48, 72)` — Like `sin`, but its first input is in Hz.

## 6. Move a knob

29. `.lpf(knob(72, 48, 96))` — Turn the cutoff by hand.
30. `.lpf(lfo(0.3, 60, 96))` — An LFO turns it for you.
31. `.lpf(72).mod("cutoff", lfo(0.3), 12)` — `mod` adds movement on top of a fixed value.
32. `.gain(0.3)` — `gain` sets the volume of any signal, at any point in the chain.

## 7. Notes in time

33. `tempo(120)` and `seq("c3 e3 g3 e3").tri()` — `seq` plays notes in turn. One pattern is one bar.
34. `s.gate` — Like `pad.x`: a second output of `seq`. It is 1 while a note plays.
35. `seq("c3 ~ g3 ~")` with `.mul(s.gate)` — `~` is a rest. The gate cuts the sound between notes.
36. `.mul(s.gate.adsr(0.005, 0.1, 0.5, 0.2))` — An envelope gives each note a shape.
37. `.mod("cutoff", s.gate.ad(0.01, 0.2), 36)` — An envelope on the filter makes a pluck.

## 8. Pattern symbols

38. `c3 [e3 g3]` — Two notes in one step.
39. `c3 <e3 g3>` — A different note each bar.
40. `c3*2` — Repeat a note inside its step.
41. `c3 _ e3` — Hold a note for two steps.
42. `c3?` — The note plays only some of the time.
43. `seed(7)` — Keeps the same random choices on every play.

## 9. Drums

44. `seq("60*4").trig.kick()` — `trig` is a click at each note start. Drums play on it.
45. Three `seq` lines, each with `.out()`, make a beat.
46. `seq("60(3,8)")` — Spreads 3 hits over 8 steps.
47. `.hihat({ decay: 0.04 })` — A short hat.

## 10. Chords and stereo

48. `seq("[c3,e3,g3]")` — A chord.
49. `.pan(-0.5)` — Moves the sound left.
50. `.pan(lfo(0.5))` — Moves it side to side.
51. ``.add(p`[-0.1, 0, 0.1]`).saw().spread()`` — Three detuned copies, spread wide.

## 11. Change patterns

52. ``p`c3 e3 g3`.fast(2)`` — `p` makes a pattern you can change.
53. `.rev()`, `.add(7)` — Backwards. Up a fifth.
54. `.every(2, q => q.add(12))` — Change every second bar.
55. ``.lpf(p`60 72 84`)`` — A pattern drives a knob, in steps.
56. `slew(...)` — Smooths the steps.
57. `quantize({ pitch, scaleName: "minor" })` — Snaps any pitch to a scale.

## 12. Mix and effects

58. `mixer({ bass, lead }).level({ lead: 0.5 })` — Named channels, one level each.
59. `.delay({ time: 0.25, feedback: 0.4, mix: 0.3 })` — An echo.
60. `.tape({...})` — A darker echo that wobbles.
61. `.reverb(...)` — A room.

## 13. Build your own

62. A plain JS function holds a chain you reuse.
63. `defpatch` — Turns a chain into a module.
64. `defmod` — Write a module that runs once per sample.
65. `loop(fb => ...)` — Feeds the output back in.
66. `counter(s.trig)` — Steps through a pattern once per click.

## 14. When it breaks

67. An error names what is wrong and what you can use instead.
68. `sin(0)` is a very low note, not silence.

## Open questions

- Chapters 13 and 14 may move to their own pages.
- Every example must run before it ships.
