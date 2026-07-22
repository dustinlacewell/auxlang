// phaser - modulated depth
// LFO opens depth 0.1 to 1 - the notches travel a wider range as it swells
saw({ freq: 110 }).phaser(0.5, lfo(0.2, 0.1, 1), 0.5).gain(0.3).out()
