// mixer - defaults
// Mix two slightly detuned sines: a slow 2 Hz beating, each channel at level 1
mixer({ a: sin({ pitch: hz(220) }), b: sin({ pitch: hz(222) }) }).out()
