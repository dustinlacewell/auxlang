// sum - all params
// Sum three oscillators to mono
poly([sin({ freq: 220 }), sin({ freq: 330 }), sin({ freq: 440 })]).sum().gain(0.2).out()
