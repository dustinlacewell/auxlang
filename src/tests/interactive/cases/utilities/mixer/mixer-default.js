// mixer - defaults
// Mix saw and slightly detuned sin for beating, each channel at level 1
mixer({ a: sin({ freq: 220 }), b: sin({ freq: 222 }) }).out()
