// phaser - modulated rate
// LFO sweeps the phaser rate 0.1 to 2Hz - the sweep speeds up and slows down
saw({ freq: 110 }).phaser(lfo(0.2, 0.1, 2), 0.7, 0.5).gain(0.3).out()
