These are guidelines not hard rules. Sometimes a rule would make the formatting worse, but prioritize/prefer them where possible.

Generally speaking,
- Ensure the description actually says what the tester should expect as tersely as comfortable
- If the example is very short, keep it on one line
- If a parameterization chain is very short, keep it on one line
- Saw is annoying to listen to, prefer sin, tri (unless the test calls for an 8-bit or dark grungy sound)
- Skinnyness over shortness
- Each device on it's own line
- Prefer positional arguments, then method setters, then object config
- Object config is good when the names are long, lots of params
- Object config attributes on their own line
- Don't access the default output by name, just use the device directly: seq.whatever vs seq.cv.whatever
- lfo rate can control how often I can hear something change:
	- 0.5 good for hearing two different values ping pong
	- 0.2 good for hearing different values over time


// good
lfo(0.3, 100, 800)
  .quantize({
    scaleName: "pentatonic blues",
    root: lfo(0.07, 0, 11),
    octave: lfo(0.13, 2, 4),
    range: lfo(0.09, 1, 5)})
  .saw()
  .lpf(1800, 0.2)
  .gain(0.3)
  .delay({ time: 0.15, feedback: 0.4, mix: 0.3 })
  .out()

// bad
lfo({ // common device, positional args preferred
    freq: 0.3,
    min: 100,
    max: 800
}).quantize("pentatonic blues", lfo(0.07, 0, 11), lfo(0.13, 2, 4), lfo(0.09, 1, 5)) // too long! use object config
  .saw()
  .lpf({ // common device, object config preferred
    cutoff: 1800,
    resonance: 0.2
  })
  .gain({ level: 0.3 }) // not enough args, use positional
  .delay(0.15, 0.4, 0.3) // obscure args, use object config
  .out()
