// mixer - defaults
// Mix saw and slightly detuned sin for beating, each channel at level 1
mixer({ a: sin({ pitch: hz(220) }), b: sin({ pitch: hz(222) }) }).out()
